'use server'

import { CACHE_TAGS } from '@shinju-date/constants'
import { toDBString } from '@shinju-date/temporal-fns'
import { revalidateTags } from '@shinju-date/web-cache'
import { revalidatePath } from 'next/cache'
import {
  ActionError,
  type ActionResult,
  adminAction,
  adminFormAction,
} from '@/lib/action'
import { createAuditLog } from '@/lib/audit-log'
import {
  ANNOUNCEMENT_HIDDEN_FIELDS,
  announcementSchema,
  updateAnnouncementSchema,
} from '../_lib/schema'

const ID_REQUIRED_ERROR = 'IDが指定されていません。'

async function revalidateAnnouncements(): Promise<void> {
  revalidatePath('/announcements')
  revalidatePath('/', 'page')
  await revalidateTags([CACHE_TAGS.ANNOUNCEMENTS])
}

export const createAnnouncementAction = adminFormAction(
  'createAnnouncementAction',
  announcementSchema,
  async (
    { supabaseClient },
    { enabled, end_at: end, level, message, start_at: start },
  ) => {
    const { data: newAnnouncement, error } = await supabaseClient
      .from('announcements')
      .insert({
        enabled,
        end_at: toDBString(end),
        level,
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
  { hiddenFields: ANNOUNCEMENT_HIDDEN_FIELDS },
)

export const updateAnnouncementAction = adminFormAction(
  'updateAnnouncementAction',
  updateAnnouncementSchema,
  async (
    { supabaseClient },
    { enabled, end_at: end, id, level, message, start_at: start },
  ) => {
    const { data: updatedAnnouncement, error } = await supabaseClient
      .from('announcements')
      .update({
        enabled,
        end_at: toDBString(end),
        level,
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
  // `id` も隠しフィールドで、画面に対応する入力欄がない
  { hiddenFields: [...ANNOUNCEMENT_HIDDEN_FIELDS, 'id'] },
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
