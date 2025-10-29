'use server'

import { logger } from '@shinju-date/logger'
import { getChannels } from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function syncChannelWithYouTube(channelId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    // Get the channel from database
    const { data: channel, error: fetchError } = await supabaseClient
      .from('channels')
      .select(
        'id, name, slug, youtube_channel:youtube_channels(youtube_channel_id)',
      )
      .eq('id', channelId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!channel) {
      return { error: 'チャンネルが見つかりませんでした。', success: false }
    }

    // Fetch channel data from YouTube API
    const youtubeChannels = await Array.fromAsync(
      getChannels({ ids: [channel.slug] }),
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
          channel_id: channel.id,
          youtube_channel_id: channel.slug,
          youtube_handle: youtubeHandle,
        },
        { onConflict: 'channel_id' },
      )
      .then(({ error: youtubeError }) => {
        if (youtubeError) {
          logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
            channelId,
            error: youtubeError,
          })
        }
      })

    // Check if update is needed
    if (youtubeChannel.snippet.title === channel.name) {
      return {
        error: 'チャンネル情報は既に最新です。',
        success: false,
      }
    }

    const currentDateTime = Temporal.Now.zonedDateTimeISO()

    // Update channel with YouTube data
    const { error: updateError } = await supabaseClient
      .from('channels')
      .update({
        name: youtubeChannel.snippet.title,
        updated_at: currentDateTime.toJSON(),
      })
      .eq('id', channelId)

    if (updateError) {
      throw updateError
    }

    revalidatePath(`/channels/${channelId}`)
    revalidatePath('/channels')
    return { success: true }
  } catch (error) {
    logger.error('チャンネルの同期に失敗しました', { channelId, error })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
