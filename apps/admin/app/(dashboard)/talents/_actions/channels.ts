'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function addYouTubeChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const talentId = formData.get('talent_id') as string
  let youtubeChannelId = formData.get('youtube_channel_id') as string

  if (!talentId) {
    return {
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    }
  }

  if (!youtubeChannelId || youtubeChannelId.trim() === '') {
    return {
      errors: {
        youtube_channel_id: [
          'YouTubeチャンネルIDまたはURLを入力してください。',
        ],
      },
    }
  }

  // Extract channel ID from URL if a URL was provided
  youtubeChannelId = youtubeChannelId.trim()
  const urlMatch = youtubeChannelId.match(
    /(?:youtube\.com\/channel\/)([a-zA-Z0-9_-]+)/,
  )
  if (urlMatch?.[1]) {
    youtubeChannelId = urlMatch[1]
  }

  // Validate that it looks like a valid YouTube channel ID (starts with UC and is 24 chars)
  if (!/^UC[a-zA-Z0-9_-]{22}$/.test(youtubeChannelId)) {
    return {
      errors: {
        youtube_channel_id: [
          '有効なYouTubeチャンネルID（UCで始まる24文字）を入力してください。',
        ],
      },
    }
  }

  try {
    // Check if the channel already exists for this talent
    const { data: existingChannel } = await supabaseClient
      .from('youtube_channels')
      .select('id')
      .eq('talent_id', talentId)
      .eq('youtube_channel_id', youtubeChannelId)
      .maybeSingle()

    if (existingChannel) {
      return {
        errors: {
          youtube_channel_id: ['このチャンネルIDは既に登録されています。'],
        },
      }
    }

    // Insert the new YouTube channel
    const { data: newChannel, error } = await supabaseClient
      .from('youtube_channels')
      .insert({
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: null,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    // Update talent's updated_at timestamp
    await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', talentId)

    // Log audit entry
    await createAuditLog('CHANNEL_CREATE', 'youtube_channels', newChannel.id, {
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
    })

    revalidatePath(`/talents/${talentId}`)
    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])

    return { success: true }
  } catch (error) {
    logger.error('YouTubeチャンネルの追加に失敗しました', {
      error,
      talent_id: talentId,
      youtube_channel_id: youtubeChannelId,
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'YouTubeチャンネルの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function removeYouTubeChannelAction(
  channelId: string,
  talentId: string,
): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  if (!channelId || !talentId) {
    return {
      error: 'チャンネルIDまたはタレントIDが指定されていません。',
      success: false,
    }
  }

  try {
    // Get channel info before deletion for audit log
    const { data: channel } = await supabaseClient
      .from('youtube_channels')
      .select('youtube_channel_id')
      .eq('id', channelId)
      .eq('talent_id', talentId)
      .single()

    if (!channel) {
      return { error: 'チャンネルが見つかりません。', success: false }
    }

    // Delete the YouTube channel
    const { error } = await supabaseClient
      .from('youtube_channels')
      .delete()
      .eq('id', channelId)
      .eq('talent_id', talentId)

    if (error) {
      throw error
    }

    // Update talent's updated_at timestamp
    await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', talentId)

    // Log audit entry
    await createAuditLog('CHANNEL_DELETE', 'youtube_channels', channelId, {
      talent_id: talentId,
      youtube_channel_id: channel.youtube_channel_id,
    })

    revalidatePath(`/talents/${talentId}`)
    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])

    return { success: true }
  } catch (error) {
    logger.error('YouTubeチャンネルの削除に失敗しました', {
      channel_id: channelId,
      error,
      talent_id: talentId,
    })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'YouTubeチャンネルの削除に失敗しました。',
      success: false,
    }
  }
}
