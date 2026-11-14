'use server'

import type { Tables, TablesUpdate } from '@shinju-date/database'
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
import { type AuditAction, createAuditLog } from '@/lib/audit-log'
import {
  requireAuthenticatedUser,
  unauthenticatedFormState,
  unauthenticatedResult,
} from '@/lib/auth'
import { syncYouTubeChannelIconSafely } from '@/lib/youtube-channel-icon'
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
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const { supabaseClient } = auth

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
    channel: NonNullable<Awaited<ReturnType<typeof resolveYouTubeChannel>>>
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
        channel: youtubeChannel,
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
      const { data: newChannel, error: youtubeError } = await supabaseClient
        .from('youtube_channels')
        .insert({
          name: resolvedChannel.name,
          talent_id: newTalent.id,
          youtube_channel_id: resolvedChannel.id,
          youtube_handle: resolvedChannel.youtubeHandle,
        })
        .select('id')
        .single()

      if (youtubeError) {
        logger.error('youtube_channelsテーブルへの書き込みに失敗しました', {
          error: youtubeError,
          youtube_channel_id: resolvedChannel.id,
        })
      } else {
        // アイコンの取得に失敗してもタレントの追加は成功扱いにする（次回の同期で再取得される）
        await syncYouTubeChannelIconSafely(resolvedChannel.channel, {
          id: newChannel.id,
          profile_images: null,
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
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const { supabaseClient } = auth

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

interface LifecycleActionResult {
  success: boolean
  error?: string
}

interface TalentLifecycleTransition {
  /** 監査ログに記録するアクション */
  auditAction: AuditAction
  /** ログやエラーメッセージに使う操作名（例: 削除） */
  label: string
  /** 対象が見つからなかった（PGRST116）ときに想定される理由 */
  notFoundReason: string
  /** 遷移前にタレントが満たしているべき状態 */
  from: {
    deleted: boolean
    status?: Tables<'talents'>['status']
  }
  /** 遷移後の値（`updated_at` は共通で付与する） */
  values: (
    now: string,
  ) => Pick<TablesUpdate<'talents'>, 'deleted_at' | 'status'>
}

const TALENT_LIFECYCLE_TRANSITIONS = {
  activate: {
    auditAction: 'CHANNEL_ACTIVATE',
    from: { deleted: false, status: 'retired' },
    label: 'アクティブ化',
    notFoundReason: '既にアクティブ・削除されている',
    values: () => ({ status: 'active' }),
  },
  delete: {
    auditAction: 'CHANNEL_DELETE',
    from: { deleted: false },
    label: '削除',
    notFoundReason: '既に削除されている',
    values: (now) => ({ deleted_at: now }),
  },
  restore: {
    auditAction: 'CHANNEL_RESTORE',
    from: { deleted: true },
    label: '復活',
    notFoundReason: '既に復活している',
    values: () => ({ deleted_at: null }),
  },
  retire: {
    auditAction: 'CHANNEL_RETIRE',
    from: { deleted: false, status: 'active' },
    label: '引退',
    notFoundReason: '既に引退・削除されている',
    values: () => ({ status: 'retired' }),
  },
} as const satisfies Record<string, TalentLifecycleTransition>

/**
 * タレントの削除・復活・引退・アクティブ化に共通する処理。
 * 遷移前の状態を条件に含めて更新し、監査ログの記録とキャッシュの再検証を行う。
 */
async function transitionTalentLifecycle(
  id: string,
  transition: TalentLifecycleTransition,
): Promise<LifecycleActionResult> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  try {
    const now = toDBString(Temporal.Now.instant())

    let query = supabaseClient
      .from('talents')
      .update({
        ...transition.values(now),
        updated_at: now,
      })
      .eq('id', id)

    if (transition.from.status) {
      query = query.eq('status', transition.from.status)
    }

    query = transition.from.deleted
      ? query.not('deleted_at', 'is', null)
      : query.is('deleted_at', null)

    const { data: talent, error } = await query.select('name').single()

    if (error) {
      // PGRST116: 条件に一致する行がない（存在しない、または既に遷移済み）
      if (error.code === 'PGRST116') {
        logger.warn(`${transition.label}対象のタレントが見つかりませんでした`, {
          id,
        })
        return {
          error: `指定されたタレントが見つかりません。${transition.notFoundReason}か、存在しないIDが指定されています。`,
          success: false,
        }
      }
      throw error
    }

    await createAuditLog(transition.auditAction, 'channels', id, {
      entityName: talent.name,
    })

    revalidatePath('/talents')
    revalidatePath(`/talents/${id}`)
    await revalidateTags(['talents', 'videos'])
    return { success: true }
  } catch (error) {
    logger.error(`タレントの${transition.label}に失敗しました`, { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : `タレントの${transition.label}に失敗しました。`,
      success: false,
    }
  }
}

export async function deleteTalentAction(
  id: string,
): Promise<LifecycleActionResult> {
  return transitionTalentLifecycle(id, TALENT_LIFECYCLE_TRANSITIONS.delete)
}

export async function restoreTalentAction(
  id: string,
): Promise<LifecycleActionResult> {
  return transitionTalentLifecycle(id, TALENT_LIFECYCLE_TRANSITIONS.restore)
}

export async function retireTalentAction(
  id: string,
): Promise<LifecycleActionResult> {
  return transitionTalentLifecycle(id, TALENT_LIFECYCLE_TRANSITIONS.retire)
}

export async function activateTalentAction(
  id: string,
): Promise<LifecycleActionResult> {
  return transitionTalentLifecycle(id, TALENT_LIFECYCLE_TRANSITIONS.activate)
}
