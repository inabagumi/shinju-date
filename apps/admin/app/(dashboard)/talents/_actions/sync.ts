'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { getChannels } from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

/**
 * タレントに紐づく YouTube チャンネル情報を YouTube API から同期する。
 *
 * ## 仕様
 * - **全チャンネルを同期する**: 先頭 1 件に限らず、紐づく `youtube_channels` をすべて対象にする
 * - **更新対象**: 各チャンネルの `name`（YouTube の title）と `youtube_handle`（customUrl）
 * - **タレント名は更新しない**: `talents.name` とチャンネル名は分離されている（#5622）。
 *   バッチの `/talents/update`（`processScrapedChannels`）と同じ方針
 * - 単一チャンネルの場合も、チャンネルの name / handle が更新される（既存のチャンネル同期としては同等）
 */
export async function syncTalentWithYouTube(talentId: string): Promise<{
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: talent, error: fetchError } = await supabaseClient
      .from('talents')
      .select(
        'id, youtube_channels(id, name, youtube_channel_id, youtube_handle)',
      )
      .eq('id', talentId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!talent) {
      return { error: 'タレントが見つかりませんでした。', success: false }
    }

    const channels = (
      Array.isArray(talent.youtube_channels)
        ? talent.youtube_channels
        : talent.youtube_channels
          ? [talent.youtube_channels]
          : []
    ).filter(
      (
        channel,
      ): channel is {
        id: string
        name: string | null
        youtube_channel_id: string
        youtube_handle: string | null
      } => channel != null,
    )

    if (channels.length === 0) {
      return {
        error: 'このタレントに紐づくYouTubeチャンネルはありません。',
        success: false,
      }
    }

    const youtubeChannels = await Array.fromAsync(
      getChannels({
        ids: channels.map((channel) => channel.youtube_channel_id),
      }),
    )

    if (youtubeChannels.length === 0) {
      return {
        error:
          'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
        success: false,
      }
    }

    const youtubeChannelById = new Map(
      youtubeChannels.map((youtubeChannel) => [
        youtubeChannel.id,
        youtubeChannel,
      ]),
    )

    const channelChanges: {
      youtube_channel_id: string
      before: { name: string | null; youtube_handle: string | null }
      after: { name: string; youtube_handle: string | null }
    }[] = []

    let hasUpdates = false
    let syncedCount = 0

    for (const channel of channels) {
      const youtubeChannel = youtubeChannelById.get(channel.youtube_channel_id)

      if (!youtubeChannel) {
        logger.warn('YouTubeでチャンネルが見つかりませんでした', {
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      if (!youtubeChannel.snippet?.title) {
        logger.warn('YouTubeからチャンネル情報を取得できませんでした', {
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      const channelName = youtubeChannel.snippet.title
      const youtubeHandle = youtubeChannel.snippet.customUrl || null

      const { error: youtubeError } = await supabaseClient
        .from('youtube_channels')
        .upsert(
          {
            id: channel.id,
            name: channelName,
            talent_id: talent.id,
            youtube_channel_id: channel.youtube_channel_id,
            youtube_handle: youtubeHandle,
          },
          { onConflict: 'id' },
        )

      if (youtubeError) {
        logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
          error: youtubeError,
          talentId,
          youtubeChannelId: channel.youtube_channel_id,
        })
        continue
      }

      syncedCount++

      if (
        channelName !== channel.name ||
        youtubeHandle !== channel.youtube_handle
      ) {
        hasUpdates = true
        channelChanges.push({
          after: {
            name: channelName,
            youtube_handle: youtubeHandle,
          },
          before: {
            name: channel.name,
            youtube_handle: channel.youtube_handle,
          },
          youtube_channel_id: channel.youtube_channel_id,
        })
      }
    }

    if (syncedCount === 0) {
      return {
        error:
          'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
        success: false,
      }
    }

    if (!hasUpdates) {
      return {
        message: 'チャンネル情報は既に最新です。',
        success: true,
        unchanged: true,
      }
    }

    const currentDateTime = Temporal.Now.instant()

    // Touch talent.updated_at so list views reflect that channel data changed
    const { error: updateError } = await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(currentDateTime),
      })
      .eq('id', talentId)

    if (updateError) {
      throw updateError
    }

    await createAuditLog('CHANNEL_SYNC', 'channels', talentId, {
      channels: channelChanges,
    })

    revalidatePath(`/talents/${talentId}`)
    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error('タレントの同期に失敗しました', { error, talentId })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
