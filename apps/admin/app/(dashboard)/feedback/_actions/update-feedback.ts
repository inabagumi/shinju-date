'use server'

import type { TablesUpdate } from '@shinju-date/database'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createEntityNameFromMessage } from '../_lib/create-entity-name-from-message'

const NOT_FOUND_ERROR = 'フィードバックが見つかりませんでした'

export async function updateFeatureRequestStatus(
  id: string,
  status: TablesUpdate<'feature_requests'>['status'],
): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedResult()
  }

  try {
    if (!status) {
      return {
        error: 'ステータスが指定されていません',
        success: false,
      }
    }

    const supabaseClient = getSupabaseAdminClient()
    const { data: featureRequest, error: fetchError } = await supabaseClient
      .from('feature_requests')
      .select('message, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!featureRequest) {
      return { error: NOT_FOUND_ERROR, success: false }
    }

    // 状態が変わらないときは、更新も監査ログの記録もしない
    if (featureRequest.status === status) {
      return { success: true }
    }

    const { error } = await supabaseClient
      .from('feature_requests')
      .update({ status })
      .eq('id', id)

    if (error) {
      throw error
    }

    await createAuditLog('FEATURE_REQUEST_UPDATE', id, {
      changes: {
        after: { status },
        before: { status: featureRequest.status },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    })

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
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedResult()
  }

  try {
    const supabaseClient = getSupabaseAdminClient()
    const { data: featureRequest, error: fetchError } = await supabaseClient
      .from('feature_requests')
      .select('admin_memo, message')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!featureRequest) {
      return { error: NOT_FOUND_ERROR, success: false }
    }

    // メモが変わらないときは、更新も監査ログの記録もしない
    if ((featureRequest.admin_memo ?? '') === adminMemo) {
      return { success: true }
    }

    const { error } = await supabaseClient
      .from('feature_requests')
      .update({ admin_memo: adminMemo })
      .eq('id', id)

    if (error) {
      throw error
    }

    // メモは長いので、本文は記録せず、メモがあるかどうかだけを記録する
    await createAuditLog('FEATURE_REQUEST_UPDATE', id, {
      changes: {
        after: { hasMemo: adminMemo !== '' },
        before: { hasMemo: Boolean(featureRequest.admin_memo) },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    })

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
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedResult()
  }

  try {
    // 既読は対応の状態ではなく、確認したかどうかの印なので、監査ログには記録しない
    const { error } = await getSupabaseAdminClient()
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
