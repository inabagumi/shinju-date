'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod'
import type { FormState } from '@/components/form'
import { isAdminUser } from '@/lib/admin-user'
import { parseFormData } from '@/lib/form'
import { getSafeRedirectPath, REDIRECT_PARAM } from '@/lib/redirect-path'
import { createSupabaseServerClient } from '@/lib/supabase'

const formSchema = z.object({
  email: z.email({
    error: (issue) =>
      issue.input === undefined
        ? 'メールアドレスは必須です。'
        : 'メールアドレスの形式が正しくありません。',
  }),
  password: z
    .string({
      error: (issue) =>
        issue.input === undefined
          ? 'パスワードは必須です。'
          : 'パスワードの形式が正しくありません。',
    })
    .min(8, 'パスワードは8文字以上入力する必要があります。'),
})

export async function signInAction(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseFormData(formSchema, formData)

  if (!parsed.success) {
    return parsed.state
  }

  const credentials = parsed.data

  const supabaseClient = await createSupabaseServerClient()
  const { data, error } =
    await supabaseClient.auth.signInWithPassword(credentials)

  if (error) {
    return {
      errors: {
        generic: ['メールアドレスかパスワードが正しくありません。'],
      },
    }
  }

  // Supabase Auth にログインできても、管理者ロールがなければセッションを残さない
  if (!isAdminUser(data.user)) {
    await supabaseClient.auth.signOut()

    return {
      errors: {
        generic: ['このアカウントには管理画面を利用する権限がありません。'],
      },
    }
  }

  // 戻り先はフォームから送られた値のため、管理画面内のパスに限定する
  redirect(getSafeRedirectPath(formData.get(REDIRECT_PARAM)))
}
