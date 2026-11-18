'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import {
  ActionError,
  type ActionResult,
  adminAction,
  adminFormAction,
} from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'

const MESSAGE_REQUIRED_ERROR = 'お知らせメッセージを入力してください。'
const ID_REQUIRED_ERROR = 'IDが指定されていません。'

const createAnnouncementSchema = z.object({
  enabled: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
  end_at: z.string().optional(),
  level: z.string().optional(),
  message: z
    .string({ error: MESSAGE_REQUIRED_ERROR })
    .trim()
    .min(1, MESSAGE_REQUIRED_ERROR),
  start_at: z.string().optional(),
})

const updateAnnouncementSchema = createAnnouncementSchema.extend({
  id: z.string({ error: ID_REQUIRED_ERROR }).min(1, ID_REQUIRED_ERROR),
})

interface AnnouncementPeriod {
  end: Temporal.Instant
  start: Temporal.Instant
}

/**
 * 掲載の開始日時と終了日時を読む。どちらかがない、形式が正しくない、終了が
 * 開始より後でないときは、`ActionError` を投げる
 */
function parsePeriod(
  startAt: string | undefined,
  endAt: string | undefined,
): AnnouncementPeriod {
  if (!startAt?.trim() || !endAt?.trim()) {
    throw new ActionError('開始日時と終了日時を入力してください。')
  }

  let period: AnnouncementPeriod

  try {
    period = {
      end: Temporal.Instant.from(endAt),
      start: Temporal.Instant.from(startAt),
    }
  } catch {
    throw new ActionError('日時の形式が正しくありません。')
  }

  if (Temporal.Instant.compare(period.start, period.end) >= 0) {
    throw new ActionError('終了日時は開始日時より後に設定してください。')
  }

  return period
}

async function revalidateAnnouncements(): Promise<void> {
  revalidatePath('/announcements')
  revalidatePath('/', 'page')
  await revalidateTags([CACHE_TAGS.ANNOUNCEMENTS])
}

export const createAnnouncementAction = adminFormAction(
  'createAnnouncementAction',
  createAnnouncementSchema,
  async (
    { supabaseClient },
    { enabled, end_at: endAt, level, message, start_at: startAt },
  ) => {
    const { end, start } = parsePeriod(startAt, endAt)
    const { data: newAnnouncement, error } = await supabaseClient
      .from('announcements')
      .insert({
        enabled,
        end_at: toDBString(end),
        level: level || 'info',
        message,
        start_at: toDBString(start),
      })
      .select('id, message')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(
      supabaseClient,
      'ANNOUNCEMENT_CREATE',
      newAnnouncement.id,
      {
        entityName: newAnnouncement.message.substring(0, 50),
      },
    )

    await revalidateAnnouncements()
  },
)

export const updateAnnouncementAction = adminFormAction(
  'updateAnnouncementAction',
  updateAnnouncementSchema,
  async (
    { supabaseClient },
    { enabled, end_at: endAt, id, level, message, start_at: startAt },
  ) => {
    const { end, start } = parsePeriod(startAt, endAt)
    const { data: updatedAnnouncement, error } = await supabaseClient
      .from('announcements')
      .update({
        enabled,
        end_at: toDBString(end),
        level: level || 'info',
        message,
        start_at: toDBString(start),
      })
      .eq('id', id)
      .select('message')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(supabaseClient, 'ANNOUNCEMENT_UPDATE', id, {
      entityName: updatedAnnouncement.message.substring(0, 50),
    })

    await revalidateAnnouncements()
  },
  // `id` は隠しフィールドで、画面に対応する入力欄がない
  { hiddenFields: ['id'] },
)

export const deleteAnnouncementAction = adminAction(
  'deleteAnnouncementAction',
  async ({ supabaseClient }, id: string): Promise<ActionResult> => {
    if (!id) {
      throw new ActionError(ID_REQUIRED_ERROR)
    }

    const { data: deletedAnnouncement, error } = await supabaseClient
      .from('announcements')
      .delete()
      .eq('id', id)
      .select('message')
      .single()

    if (error) {
      throw error
    }

    await createAuditLog(supabaseClient, 'ANNOUNCEMENT_DELETE', id, {
      entityName: deletedAnnouncement.message.substring(0, 50),
    })

    await revalidateAnnouncements()

    return { success: true }
  },
)
