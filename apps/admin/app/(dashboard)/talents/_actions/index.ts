'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function createTalentAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const name = formData.get('name') as string
  const youtubeChannelId = formData.get('youtube_channel_id') as string

  if (!name || name.trim() === '') {
    return {
      errors: {
        name: ['タレント名を入力してください。'],
      },
    }
  }

  try {
    const { data: newTalent, error } = await supabaseClient
      .from('talents')
      .insert({
        name: name.trim(),
      })
      .select('id, name')
      .single()

    if (error) {
      throw error
    }

    // Write to youtube_channels table if talent_id is provided
    // Note: youtube_handle is null for manually created talents initially
    // It will be populated when the talent sync runs
    if (youtubeChannelId && youtubeChannelId.trim() !== '') {
      await supabaseClient
        .from('youtube_channels')
        .insert({
          talent_id: newTalent.id,
          youtube_channel_id: youtubeChannelId.trim(),
          youtube_handle: null,
        })
        .then(({ error: youtubeError }) => {
          if (youtubeError) {
            logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
              error: youtubeError,
              youtube_channel_id: youtubeChannelId.trim(),
            })
          }
        })
    }

    // Log audit entry
    await createAuditLog('CHANNEL_CREATE', 'channels', newTalent.id, {
      entityName: newTalent.name,
    })

    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])
    return {}
  } catch (error) {
    logger.error('タレントの追加に失敗しました', {
      error,
      name: name.trim(),
      youtube_channel_id: youtubeChannelId?.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'タレントの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function updateTalentAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabaseClient = await createSupabaseServerClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const themeColor = formData.get('theme_color') as string
  const youtubeChannelId = formData.get('youtube_channel_id') as string

  if (!id || !name || name.trim() === '') {
    return {
      errors: {
        name: ['タレント名を入力してください。'],
      },
    }
  }

  // Validate theme_color format if provided
  if (themeColor && themeColor.trim() !== '') {
    const colorPattern = /^#[0-9A-Fa-f]{6}$/
    if (!colorPattern.test(themeColor.trim())) {
      return {
        errors: {
          theme_color: [
            'カラーコードは#RRGGBB形式で入力してください（例: #FF5733）',
          ],
        },
      }
    }
  }

  try {
    // Update talents table (name and theme_color)
    const { data: talent, error } = await supabaseClient
      .from('talents')
      .update({
        name: name.trim(),
        theme_color:
          themeColor && themeColor.trim() !== '' ? themeColor.trim() : null,
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', id)
      .select('name')
      .single()

    if (error) {
      throw error
    }

    // Note: Channel management is read-only for now when multiple channels exist
    // Future enhancement: Add UI for managing multiple channels individually

    // Log audit entry
    await createAuditLog('CHANNEL_UPDATE', 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])
    return {}
  } catch (error) {
    logger.error('タレントの更新に失敗しました', {
      error,
      id,
      name: name.trim(),
      theme_color: themeColor?.trim(),
      youtube_channel_id: youtubeChannelId?.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'タレントの更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteTalentAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  try {
    const now = Temporal.Now.instant()

    const { data: talent, error } = await supabaseClient
      .from('talents')
      .update({
        deleted_at: toDBString(now),
        updated_at: toDBString(now),
      })
      .eq('id', id)
      .select('name')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('CHANNEL_DELETE', 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error('タレントの削除に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'タレントの削除に失敗しました。',
      success: false,
    }
  }
}
