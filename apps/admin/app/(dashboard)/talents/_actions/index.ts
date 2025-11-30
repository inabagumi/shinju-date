'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import * as z from 'zod'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'
import { zodErrorToFormState } from '../_lib/form-helpers'

const updateTalentSchema = z.object({
  id: z.string().uuid({ message: '有効なIDではありません。' }),
  name: z
    .string({ message: 'タレント名を入力してください。' })
    .trim()
    .min(1, 'タレント名を入力してください。'),
  theme_color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: 'カラーコードは#RRGGBB形式で入力してください（例: #FF5733）',
    })
    .nullable()
    .optional()
    .transform((val) => {
      if (!val || val === '') return null
      return val
    }),
})

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
      const { error: youtubeError } = await supabaseClient
        .from('youtube_channels')
        .insert({
          talent_id: newTalent.id,
          youtube_channel_id: youtubeChannelId.trim(),
          youtube_handle: null,
        })

      if (youtubeError) {
        logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
          error: youtubeError,
          youtube_channel_id: youtubeChannelId.trim(),
        })
      }
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

  let validatedData: z.infer<typeof updateTalentSchema>

  try {
    validatedData = updateTalentSchema.parse({
      id: formData.get('id'),
      name: formData.get('name'),
      theme_color: formData.get('theme_color'),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodErrorToFormState(error)
    }

    return {
      errors: {
        generic: ['入力された値が正しくありません。'],
      },
    }
  }

  try {
    // Update talents table (name and theme_color)
    const { data: talent, error } = await supabaseClient
      .from('talents')
      .update({
        name: validatedData.name,
        theme_color: validatedData.theme_color,
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', validatedData.id)
      .select('name')
      .single()

    if (error) {
      // Handle PGRST116 error: No rows found (talent doesn't exist)
      if (error.code === 'PGRST116') {
        logger.warn('更新対象のタレントが見つかりませんでした', {
          id: validatedData.id,
        })
        return {
          errors: {
            generic: [
              '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
            ],
          },
        }
      }
      throw error
    }

    // Note: Channel management is read-only for now when multiple channels exist
    // Future enhancement: Add UI for managing multiple channels individually

    // Log audit entry
    await createAuditLog('CHANNEL_UPDATE', 'channels', validatedData.id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    await revalidateTags(['talents', 'videos'])
    return {}
  } catch (error) {
    logger.error('タレントの更新に失敗しました', {
      error,
      id: validatedData.id,
      name: validatedData.name,
      theme_color: validatedData.theme_color,
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
      // Handle PGRST116 error: No rows found (talent doesn't exist)
      if (error.code === 'PGRST116') {
        logger.warn('削除対象のタレントが見つかりませんでした', { id })
        return {
          error:
            '指定されたタレントが見つかりません。既に削除されているか、存在しないIDが指定されています。',
          success: false,
        }
      }
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
