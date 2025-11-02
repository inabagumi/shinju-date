'use server'

import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function createAnnouncementAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const message = formData.get('message') as string
  const level = formData.get('level') as string
  const startAt = formData.get('start_at') as string
  const endAt = formData.get('end_at') as string
  const enabled = formData.get('enabled') === 'true'

  if (!message || message.trim() === '') {
    return {
      errors: {
        message: ['お知らせメッセージを入力してください。'],
      },
    }
  }

  if (!startAt || !endAt) {
    return {
      errors: {
        generic: ['開始日時と終了日時を入力してください。'],
      },
    }
  }

  // Validate dates
  try {
    const start = Temporal.Instant.from(startAt)
    const end = Temporal.Instant.from(endAt)

    if (Temporal.Instant.compare(start, end) >= 0) {
      return {
        errors: {
          generic: ['終了日時は開始日時より後に設定してください。'],
        },
      }
    }
  } catch (_error) {
    return {
      errors: {
        generic: ['日時の形式が正しくありません。'],
      },
    }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: newAnnouncement, error } = await supabaseClient
      .from('announcements')
      .insert({
        enabled,
        end_at: endAt,
        level: level || 'info',
        message: message.trim(),
        start_at: startAt,
      })
      .select('id, message')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog(
      'ANNOUNCEMENT_CREATE',
      'announcements',
      newAnnouncement.id,
      {
        entityName: newAnnouncement.message.substring(0, 50),
      },
    )

    revalidatePath('/announcements')
    revalidatePath('/', 'page')
    return {}
  } catch (error) {
    logger.error('お知らせの追加に失敗しました', {
      error,
      message: message.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'お知らせの追加に失敗しました。',
        ],
      },
    }
  }
}

export async function updateAnnouncementAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get('id') as string
  const message = formData.get('message') as string
  const level = formData.get('level') as string
  const startAt = formData.get('start_at') as string
  const endAt = formData.get('end_at') as string
  const enabled = formData.get('enabled') === 'true'

  if (!id || !message || message.trim() === '') {
    return {
      errors: {
        message: ['お知らせメッセージを入力してください。'],
      },
    }
  }

  if (!startAt || !endAt) {
    return {
      errors: {
        generic: ['開始日時と終了日時を入力してください。'],
      },
    }
  }

  // Validate dates
  try {
    const start = Temporal.Instant.from(startAt)
    const end = Temporal.Instant.from(endAt)

    if (Temporal.Instant.compare(start, end) >= 0) {
      return {
        errors: {
          generic: ['終了日時は開始日時より後に設定してください。'],
        },
      }
    }
  } catch (_error) {
    return {
      errors: {
        generic: ['日時の形式が正しくありません。'],
      },
    }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: updatedAnnouncement, error } = await supabaseClient
      .from('announcements')
      .update({
        enabled,
        end_at: endAt,
        level: level || 'info',
        message: message.trim(),
        start_at: startAt,
        updated_at: toDBString(Temporal.Now.instant()),
      })
      .eq('id', id)
      .select('message')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('ANNOUNCEMENT_UPDATE', 'announcements', id, {
      entityName: updatedAnnouncement.message.substring(0, 50),
    })

    revalidatePath('/announcements')
    revalidatePath('/', 'page')
    return {}
  } catch (error) {
    logger.error('お知らせの更新に失敗しました', {
      error,
      id,
      message: message.trim(),
    })
    return {
      errors: {
        generic: [
          error instanceof Error
            ? error.message
            : 'お知らせの更新に失敗しました。',
        ],
      },
    }
  }
}

export async function deleteAnnouncementAction(id: string): Promise<{
  success: boolean
  error?: string
}> {
  if (!id) {
    return { error: 'IDが指定されていません。', success: false }
  }

  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: deletedAnnouncement, error } = await supabaseClient
      .from('announcements')
      .delete()
      .eq('id', id)
      .select('message')
      .single()

    if (error) {
      throw error
    }

    // Log audit entry
    await createAuditLog('ANNOUNCEMENT_DELETE', 'announcements', id, {
      entityName: deletedAnnouncement.message.substring(0, 50),
    })

    revalidatePath('/announcements')
    revalidatePath('/', 'page')
    return { success: true }
  } catch (error) {
    logger.error('お知らせの削除に失敗しました', { error, id })
    return {
      error:
        error instanceof Error
          ? error.message
          : 'お知らせの削除に失敗しました。',
      success: false,
    }
  }
}
