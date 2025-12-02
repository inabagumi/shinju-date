'use server'

import type { TablesUpdate } from '@shinju-date/database'
import { revalidatePath } from 'next/cache'
import { supabaseClient } from '@/lib/supabase/admin'

export async function updateFeatureRequestStatus(
  id: string,
  status: TablesUpdate<'feature_requests'>['status'],
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!status) {
      return {
        error: 'ステータスが指定されていません',
        success: false,
      }
    }

    const { error } = await supabaseClient
      .from('feature_requests')
      .update({ status })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Update feature request status error:', error)
    return {
      error: 'ステータスの更新に失敗しました',
      success: false,
    }
  }
}

export async function updateFeatureRequestMemo(
  id: string,
  adminMemo: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('feature_requests')
      .update({ admin_memo: adminMemo })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Update feature request memo error:', error)
    return {
      error: 'メモの更新に失敗しました',
      success: false,
    }
  }
}

export async function markFeatureRequestAsRead(
  id: string,
  isRead: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseClient
      .from('feature_requests')
      .update({ is_read: isRead })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidatePath('/feedback')
    return { success: true }
  } catch (error) {
    console.error('Mark feature request as read error:', error)
    return {
      error: '既読状態の更新に失敗しました',
      success: false,
    }
  }
}
