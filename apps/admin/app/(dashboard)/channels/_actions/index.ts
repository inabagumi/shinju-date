'use server'

import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function createChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const name = formData.get('name') as string
  const channelId = formData.get('channel_id') as string

  if (!name || name.trim() === '') {
    return {
      errors: {
        name: ['タレント名を入力してください。'],
      },
    }
  }

  try {
    const { data: newChannel, error } = await supabaseClient
      .from('channels')
      .insert({
        name: name.trim(),
      })
      .select('id, name')
      .single()

    if (error) {
      throw error
    }

    // Write to youtube_channels table if channel_id is provided
    // Note: youtube_handle is null for manually created channels initially
    // It will be populated when the channel sync runs
    if (channelId && channelId.trim() !== '') {
      await supabaseClient
        .from('youtube_channels')
        .insert({
          channel_id: newChannel.id,
          youtube_channel_id: channelId.trim(),
          youtube_handle: null,
        })
        .then(({ error: youtubeError }) => {
          if (youtubeError) {
            logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
              error: youtubeError,
              youtube_channel_id: channelId.trim(),
            })
          }
        })
    }

    // Log audit entry
    await createAuditLog('CHANNEL_CREATE', 'channels', newChannel.id, {
      entityName: newChannel.name,
    })

    revalidatePath('/channels')
    return {}
  } catch (error) {
    logger.error('チャンネルの追加に失敗しました', {
      channel_id: channelId?.trim(),
      error,
      name: name.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'チャンネルの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function updateChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const youtubeChannelId = formData.get('channel_id') as string

  if (!id || !name || name.trim() === '') {
    return {
      errors: {
        name: ['タレント名を入力してください。'],
      },
    }
  }

  try {
    // First, get the current youtube_channel_id to check if it changed
    const { data: currentYoutubeChannel, error: fetchError } =
      await supabaseClient
        .from('youtube_channels')
        .select('youtube_channel_id')
        .eq('channel_id', id)
        .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    // Update channels table (only name now)
    const { data: channel, error } = await supabaseClient
      .from('channels')
      .update({
        name: name.trim(),
      })
      .eq('id', id)
      .select('name')
      .single()

    if (error) {
      throw error
    }

    // Update or insert youtube_channels if youtube_channel_id is provided
    if (youtubeChannelId && youtubeChannelId.trim() !== '') {
      if (
        !currentYoutubeChannel ||
        currentYoutubeChannel.youtube_channel_id !== youtubeChannelId.trim()
      ) {
        const { error: youtubeError } = await supabaseClient
          .from('youtube_channels')
          .upsert({
            channel_id: id,
            youtube_channel_id: youtubeChannelId.trim(),
          })

        if (youtubeError) {
          logger.error('youtube_channelsテーブルの更新に失敗しました', {
            error: youtubeError,
            id,
            youtube_channel_id: youtubeChannelId.trim(),
          })
        }
      }
    }

    // Log audit entry
    await createAuditLog('CHANNEL_UPDATE', 'channels', id, {
      entityName: channel.name,
    })

    revalidatePath('/channels')
    return {}
  } catch (error) {
    logger.error('チャンネルの更新に失敗しました', {
      error,
      id,
      name: name.trim(),
      youtube_channel_id: youtubeChannelId?.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'チャンネルの更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteChannelAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  try {
    const { data: channel, error } = await supabaseClient
      .from('channels')
      .update({
        deleted_at: Temporal.Now.instant().toString(),
      })
      .eq('id', id)
      .select('name')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('CHANNEL_DELETE', 'channels', id, {
      entityName: channel.name,
    })

    revalidatePath('/channels')
    return { success: true }
  } catch (error) {
    logger.error('チャンネルの削除に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'チャンネルの削除に失敗しました。',
      success: false,
    }
  }
}
