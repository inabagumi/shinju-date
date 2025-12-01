'use server'

import type { TablesUpdate } from '@shinju-date/database'
import { revalidatePath } from 'next/cache'
import { supabaseClient } from '@/lib/supabase/admin'

export async function updateFeedbackStatus(
  id: string,
  status: TablesUpdate<'feedback'>['status'],
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!status) {
      return {
        error: 'ステータスが指定されていません',
        success: false,
      }
    }

    const { error } = await supabaseClient
      .from('feedback')
      .update({ status })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Update feedback status error:', error)
    return {
      error: 'ステータスの更新に失敗しました',
      success: false,
    }
  }
}

export async function updateFeedbackMemo(
  id: string,
  adminMemo: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('feedback')
      .update({ admin_memo: adminMemo })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Update feedback memo error:', error)
    return {
      error: 'メモの更新に失敗しました',
      success: false,
    }
  }
}

export async function markFeedbackAsRead(
  id: string,
  isRead: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('feedback')
      .update({ is_read: isRead })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Mark feedback as read error:', error)
    return {
      error: '既読状態の更新に失敗しました',
      success: false,
    }
  }
}
