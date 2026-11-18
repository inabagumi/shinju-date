'use server'

import { revalidatePath } from 'next/cache'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedFormState } from '@/lib/auth'
import { parseFormData } from '@/lib/form'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createEntityNameFromMessage } from '../_lib/create-entity-name-from-message'
import {
  feedbackMemoFormSchema,
  feedbackReadFormSchema,
  feedbackStatusFormSchema,
} from '../_lib/feedback-form-schema'

const INVALID_INPUT_ERROR = '入力が正しくありません。'
const NOT_FOUND_ERROR = 'フィードバックが見つかりませんでした。'

/**
 * 項目に結び付かないエラーの `FormState`。入力欄は選択肢とメモだけで、ほかの値は
 * 隠しフィールドなので、検証の失敗も項目ごとに分けず、このエラーにする
 */
function errorState(message: string): FormState {
  return { errors: { generic: [message] } }
}

/**
 * 一覧と詳細の両方のページを再検証する。詳細のページは、状態・メモ・既読を
 * `getFeatureRequestById` の結果から表示するので、一覧だけでは古い値が残る
 */
function revalidateFeatureRequest(id: string): void {
  revalidatePath('/feedback')
  revalidatePath(`/feedback/${id}`)
}

export async function updateFeatureRequestStatus(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const parsed = parseFormData(feedbackStatusFormSchema, formData)

  if (!parsed.success) {
    return errorState(INVALID_INPUT_ERROR)
  }

  const { id, status } = parsed.data

  try {
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
      return errorState(NOT_FOUND_ERROR)
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

    await createAuditLog(auth.supabaseClient, 'FEATURE_REQUEST_UPDATE', id, {
      changes: {
        after: { status },
        before: { status: featureRequest.status },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    })

    revalidateFeatureRequest(id)
    return { success: true }
  } catch (error) {
    console.error('Update feature request status error:', error)
    return errorState('ステータスの更新に失敗しました。')
  }
}

export async function updateFeatureRequestMemo(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedFormState()
  }

  const parsed = parseFormData(feedbackMemoFormSchema, formData)

  if (!parsed.success) {
    return errorState(INVALID_INPUT_ERROR)
  }

  const { admin_memo: adminMemo, id } = parsed.data

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
      return errorState(NOT_FOUND_ERROR)
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
    await createAuditLog(auth.supabaseClient, 'FEATURE_REQUEST_UPDATE', id, {
      changes: {
        after: { hasMemo: adminMemo !== '' },
        before: { hasMemo: Boolean(featureRequest.admin_memo) },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    })

    revalidateFeatureRequest(id)
    return { success: true }
  } catch (error) {
    console.error('Update feature request memo error:', error)
    return errorState('メモの更新に失敗しました。')
  }
}

export async function markFeatureRequestAsRead(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!(await requireAuthenticatedUser())) {
    return unauthenticatedFormState()
  }

  const parsed = parseFormData(feedbackReadFormSchema, formData)

  if (!parsed.success) {
    return errorState(INVALID_INPUT_ERROR)
  }

  const { id, is_read: isRead } = parsed.data

  try {
    // 既読は対応の状態ではなく、確認したかどうかの印なので、監査ログには記録しない
    const { error } = await getSupabaseAdminClient()
      .from('feature_requests')
      .update({ is_read: isRead })
      .eq('id', id)

    if (error) {
      throw error
    }

    revalidateFeatureRequest(id)
    return { success: true }
  } catch (error) {
    console.error('Mark feature request as read error:', error)
    return errorState('既読状態の更新に失敗しました。')
  }
}
