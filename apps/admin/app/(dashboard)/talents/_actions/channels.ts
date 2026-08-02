'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import {
  parseYouTubeChannelIdentifier,
  resolveYouTubeChannel,
} from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

function youtubeApiErrorFormState(error: unknown): FormState {
  if (error instanceof TypeError && error.message.includes('API Key')) {
    return {
      errors: {
        generic: [
          'YouTube APIキーが設定されていません。管理者に連絡してください。',
        ],
      },
    }
  }

  logger.error('YouTube APIの呼び出しに失敗しました', { error })
  return {
    errors: {
      generic: [
        'YouTube APIへの接続に失敗しました。しばらくしてから再度お試しください。',
      ],
    },
  }
}

export async function addYouTubeChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const talentId = formData.get('talent_id') as string
  const rawInput = (formData.get('youtube_channel_id') as string) ?? ''

  if (!talentId) {
    return {
      errors: {
        generic: ['タレントIDが指定されていません。'],
      },
    }
  }

  if (!rawInput.trim()) {
    return {
      errors: {
        youtube_channel_id: [
          'YouTubeチャンネルID、ハンドル、またはURLを入力してください。',
        ],
      },
    }
  }

  const identifier = parseYouTubeChannelIdentifier(rawInput)
  if (!identifier) {
    return {
      errors: {
        youtube_channel_id: [
          '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
        ],
      },
    }
  }

  let youtubeChannel: Awaited<ReturnType<typeof resolveYouTubeChannel>>
  try {
    youtubeChannel = await resolveYouTubeChannel(identifier)
  } catch (error) {
    return youtubeApiErrorFormState(error)
  }

  if (!youtubeChannel) {
    return {
      errors: {
        youtube_channel_id: [
          'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
        ],
      },
    }
  }

  const youtubeChannelId = youtubeChannel.id
  const channelName = youtubeChannel.snippet.title
  const youtubeHandle = youtubeChannel.snippet.customUrl || null

  try {
    // Unique across all talents (youtube_channel_id has a global unique constraint)
    const { data: existingChannel } = await supabaseClient
      .from('youtube_channels')
      .select('id, talent_id')
      .eq('youtube_channel_id', youtubeChannelId)
      .maybeSingle()

    if (existingChannel) {
      if (existingChannel.talent_id === talentId) {
        return {
          errors: {
            youtube_channel_id: ['このチャンネルは既に登録されています。'],
          },
        }
      }
      return {
        errors: {
          youtube_channel_id: [
            'このチャンネルは別のタレントに既に登録されています。',
          ],
        },
      }
    }

    const { data: newChannel, error } = await supabaseClient
      .from('youtube_channels')
      .insert({
        name: channelName,
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: youtubeHandle,
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    await supabaseClient
      .from('talents')
      .update({
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', talentId)

    await createAuditLog(
      'YOUTUBE_CHANNEL_CREATE',
      'youtube_channels',
      newChannel.id,
      {
        name: channelName,
        talent_id: talentId,
        youtube_channel_id: youtubeChannelId,
        youtube_handle: youtubeHandle,
      },
    )

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
    const { data: channel, error: fetchError } = await supabaseClient
      .from('youtube_channels')
      .select('youtube_channel_id')
      .eq('id', channelId)
      .eq('talent_id', talentId)
      .single()

    if (fetchError) {
      // Handle PGRST116 error: No rows found (channel doesn't exist)
      if (fetchError.code === 'PGRST116') {
        logger.warn('削除対象のチャンネルが見つかりませんでした', {
          channel_id: channelId,
          talent_id: talentId,
        })
        return {
          error:
            '指定されたチャンネルが見つかりません。既に削除されているか、存在しないIDが指定されています。',
          success: false,
        }
      }
      throw fetchError
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
    await createAuditLog(
      'YOUTUBE_CHANNEL_DELETE',
      'youtube_channels',
      channelId,
      {
        talent_id: talentId,
        youtube_channel_id: channel.youtube_channel_id,
      },
    )

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
