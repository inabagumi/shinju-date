'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { getChannels } from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function syncTalentWithYouTube(talentId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    // Get the talent from database
    const { data: talent, error: fetchError } = await supabaseClient
      .from('talents')
      .select('id, name, youtube_channels!inner(id, youtube_channel_id)')
      .eq('id', talentId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!talent) {
      return { error: 'タレントが見つかりませんでした。', success: false }
    }

    // Handle multiple channels - sync the first one for now
    const channels = Array.isArray(talent.youtube_channels)
      ? talent.youtube_channels
      : [talent.youtube_channels]

    if (channels.length === 0) {
      return {
        error: 'このタレントに紐づくYouTubeチャンネルはありません。',
        success: false,
      }
    }

    // For now, sync only the first channel
    const firstChannel = channels[0]

    if (!firstChannel) {
      return {
        error: 'このタレントに紐づくYouTubeチャンネルはありません。',
        success: false,
      }
    }

    // Fetch channel data from YouTube API
    const youtubeChannels = await Array.fromAsync(
      getChannels({ ids: [firstChannel.youtube_channel_id] }),
    )

    if (youtubeChannels.length === 0) {
      return {
        error:
          'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
        success: false,
      }
    }

    const youtubeChannel = youtubeChannels[0]

    if (!youtubeChannel) {
      return {
        error:
          'YouTubeでチャンネルが見つかりませんでした。チャンネルIDが正しいか確認してください。',
        success: false,
      }
    }

    // Check if snippet exists and has title
    if (!youtubeChannel.snippet?.title) {
      return {
        error: 'YouTubeからチャンネル情報を取得できませんでした。',
        success: false,
      }
    }

    // Dual-write to youtube_channels table (always upsert regardless of name change)
    const youtubeHandle = youtubeChannel.snippet.customUrl || null
    await supabaseClient
      .from('youtube_channels')
      .upsert(
        {
          id: firstChannel.id,
          talent_id: talent.id,
          youtube_channel_id: firstChannel.youtube_channel_id,
          youtube_handle: youtubeHandle,
        },
        { onConflict: 'id' },
      )
      .then(({ error: youtubeError }) => {
        if (youtubeError) {
          logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
            error: youtubeError,
            talentId,
          })
        }
      })

    // Check if update is needed
    if (youtubeChannel.snippet.title === talent.name) {
      return {
        error: 'タレント情報は既に最新です。',
        success: false,
      }
    }

    const currentDateTime = Temporal.Now.instant()

    // Update talent with YouTube data
    const { error: updateError } = await supabaseClient
      .from('talents')
      .update({
        name: youtubeChannel.snippet.title,
        updated_at: toDBString(currentDateTime),
      })
      .eq('id', talentId)

    if (updateError) {
      throw updateError
    }

    // Log audit entry
    await createAuditLog('CHANNEL_SYNC', 'channels', talentId, {
      after: { name: youtubeChannel.snippet.title },
      before: { name: talent.name },
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
