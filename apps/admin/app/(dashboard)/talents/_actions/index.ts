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
  const rawChannelInput = (formData.get('youtube_channel_id') as string) ?? ''

  if (!name || name.trim() === '') {
    return {
      errors: {
        name: ['タレント名を入力してください。'],
      },
    }
  }

  // Resolve optional YouTube channel before insert so we fail fast on bad input
  let resolvedChannel: {
    id: string
    name: string
    youtubeHandle: string | null
  } | null = null

  if (rawChannelInput.trim() !== '') {
    const identifier = parseYouTubeChannelIdentifier(rawChannelInput)
    if (!identifier) {
      return {
        errors: {
          youtube_channel_id: [
            '有効なチャンネルID（UC...）、ハンドル（@name）、またはYouTube URLを入力してください。',
          ],
        },
      }
    }

    try {
      const youtubeChannel = await resolveYouTubeChannel(identifier)
      if (!youtubeChannel) {
        return {
          errors: {
            youtube_channel_id: [
              'YouTubeでチャンネルが見つかりませんでした。入力内容を確認してください。',
            ],
          },
        }
      }
      resolvedChannel = {
        id: youtubeChannel.id,
        name: youtubeChannel.snippet.title,
        youtubeHandle: youtubeChannel.snippet.customUrl || null,
      }
    } catch (error) {
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

    if (resolvedChannel) {
      const { error: youtubeError } = await supabaseClient
        .from('youtube_channels')
        .insert({
          name: resolvedChannel.name,
          talent_id: newTalent.id,
          youtube_channel_id: resolvedChannel.id,
          youtube_handle: resolvedChannel.youtubeHandle,
        })

      if (youtubeError) {
        logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
          error: youtubeError,
          youtube_channel_id: resolvedChannel.id,
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
      youtube_channel_id: resolvedChannel?.id,
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
      .is('deleted_at', null)
      .select('name')
      .single()

    if (error) {
      // Handle PGRST116 error: No rows found (talent doesn't exist or is deleted)
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
      .is('deleted_at', null)
      .select('name')
      .single()

    if (error) {
      // Handle PGRST116 error: No rows found (talent doesn't exist or already deleted)
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
    revalidatePath(`/talents/${id}`)
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

export async function restoreTalentAction(id: string): Promise<{
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
        deleted_at: null,
        updated_at: toDBString(now),
      })
      .eq('id', id)
      .not('deleted_at', 'is', null)
      .select('name')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('復活対象のタレントが見つかりませんでした', { id })
        return {
          error:
            '指定されたタレントが見つかりません。既に復活しているか、存在しないIDが指定されています。',
          success: false,
        }
      }
      throw error
    }

    await createAuditLog('CHANNEL_RESTORE', 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    revalidatePath(`/talents/${id}`)
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error('タレントの復活に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'タレントの復活に失敗しました。',
      success: false,
    }
  }
}

export async function retireTalentAction(id: string): Promise<{
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
        status: 'retired',
        updated_at: toDBString(now),
      })
      .eq('id', id)
      .eq('status', 'active')
      .is('deleted_at', null)
      .select('name')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('引退対象のタレントが見つかりませんでした', { id })
        return {
          error:
            '指定されたタレントが見つかりません。既に引退・削除されているか、存在しないIDが指定されています。',
          success: false,
        }
      }
      throw error
    }

    await createAuditLog('CHANNEL_RETIRE', 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    revalidatePath(`/talents/${id}`)
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error('タレントの引退に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'タレントの引退に失敗しました。',
      success: false,
    }
  }
}

export async function activateTalentAction(id: string): Promise<{
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
        status: 'active',
        updated_at: toDBString(now),
      })
      .eq('id', id)
      .eq('status', 'retired')
      .is('deleted_at', null)
      .select('name')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        logger.warn('アクティブ化対象のタレントが見つかりませんでした', { id })
        return {
          error:
            '指定されたタレントが見つかりません。既にアクティブ・削除されているか、存在しないIDが指定されています。',
          success: false,
        }
      }
      throw error
    }

    await createAuditLog('CHANNEL_ACTIVATE', 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    revalidatePath(`/talents/${id}`)
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error('タレントのアクティブ化に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'タレントのアクティブ化に失敗しました。',
      success: false,
    }
  }
}
