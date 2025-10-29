'use server'

import { logger } from '@shinju-date/logger'
import { revalidatePath } from 'next/cache'
import type { FormState } from '@/components/form'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function createChannelAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  if (!name || name.trim() === '') {
    return {
      errors: {
        name: ['チャンネル名を入力してください。'],
      },
    }
  }

  if (!slug || slug.trim() === '') {
    return {
      errors: {
        slug: ['チャンネルIDを入力してください。'],
      },
    }
  }

  try {
    const { data: newChannel, error } = await supabaseClient
      .from('channels')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
      })
      .select('id')
      .single()

    if (error) {
      throw error
    }

    // Dual-write to youtube_channels table
    // Note: youtube_handle is null for manually created channels initially
    // It will be populated when the channel sync runs
    await supabaseClient
      .from('youtube_channels')
      .insert({
        channel_id: newChannel.id,
        youtube_channel_id: slug.trim(),
        youtube_handle: null,
      })
      .then(({ error: youtubeError }) => {
        if (youtubeError) {
          logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
            error: youtubeError,
            slug: slug.trim(),
          })
        }
      })

    revalidatePath('/channels')
    return {}
  } catch (error) {
    logger.error('チャンネルの追加に失敗しました', {
      error,
      name: name.trim(),
      slug: slug.trim(),
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
  const slug = formData.get('slug') as string

  if (!id || !name || name.trim() === '') {
    return {
      errors: {
        name: ['チャンネル名を入力してください。'],
      },
    }
  }

  if (!slug || slug.trim() === '') {
    return {
      errors: {
        slug: ['チャンネルIDを入力してください。'],
      },
    }
  }

  try {
    // First, get the current channel data to check if slug changed
    const { data: currentChannel, error: fetchError } = await supabaseClient
      .from('channels')
      .select('slug')
      .eq('id', id)
      .single()

    if (fetchError) {
      throw fetchError
    }

    const { error } = await supabaseClient
      .from('channels')
      .update({
        name: name.trim(),
        slug: slug.trim(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    // Update youtube_channels if slug changed
    if (currentChannel && currentChannel.slug !== slug.trim()) {
      await supabaseClient
        .from('youtube_channels')
        .update({
          youtube_channel_id: slug.trim(),
        })
        .eq('channel_id', id)
        .then(({ error: youtubeError }) => {
          if (youtubeError) {
            logger.error('youtube_channelsテーブルの更新に失敗しました', {
              error: youtubeError,
              id,
              slug: slug.trim(),
            })
          }
        })
    }

    revalidatePath('/channels')
    return {}
  } catch (error) {
    logger.error('チャンネルの更新に失敗しました', {
      error,
      id,
      name: name.trim(),
      slug: slug.trim(),
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
    const { error } = await supabaseClient
      .from('channels')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      throw error
    }

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
