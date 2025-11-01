'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'
import { zodErrorToFormState } from '../_lib/form-helpers'

const emailSchema = z.object({
  email: z.email({
    message: 'メールアドレスの形式が正しくありません。',
  }),
})

const passwordSchema = z
  .object({
    confirmPassword: z
      .string({ message: 'パスワードの確認は必須です。' })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
    currentPassword: z
      .string({ message: '現在のパスワードは必須です。' })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
    newPassword: z
      .string({ message: '新しいパスワードは必須です。' })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '新しいパスワードと確認用パスワードが一致しません。',
    path: ['confirmPassword'],
  })

export async function updateUserEmail(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  let email: z.infer<typeof emailSchema>

  try {
    email = emailSchema.parse({
      email: formData.get('email'),
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

  const supabaseClient = await createSupabaseServerClient()

  // Get current user to log the change
  const {
    data: { user: currentUser },
    error: getUserError,
  } = await supabaseClient.auth.getUser()

  if (getUserError || !currentUser) {
    return {
      errors: {
        generic: ['ユーザー情報の取得に失敗しました。'],
      },
    }
  }

  // Update email - this will send a confirmation email to the new address
  // The email won't be changed until the user clicks the confirmation link
  // Audit log will be created in the callback handler after email confirmation
  const { error } = await supabaseClient.auth.updateUser(
    {
      email: email.email,
    },
    {
      emailRedirectTo: `${process.env['NEXT_PUBLIC_BASE_URL'] || 'http://localhost:4000'}/api/auth/callback`,
    },
  )

  if (error) {
    return {
      errors: {
        generic: ['メールアドレスの更新に失敗しました。'],
      },
    }
  }

  revalidatePath('/account')

  return { success: true }
}

export async function updateUserPassword(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  let passwords: z.infer<typeof passwordSchema>

  try {
    passwords = passwordSchema.parse({
      confirmPassword: formData.get('confirmPassword'),
      currentPassword: formData.get('currentPassword'),
      newPassword: formData.get('newPassword'),
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

  const supabaseClient = await createSupabaseServerClient()

  // Get current user
  const {
    data: { user: currentUser },
    error: getUserError,
  } = await supabaseClient.auth.getUser()

  if (getUserError || !currentUser || !currentUser.email) {
    return {
      errors: {
        generic: ['ユーザー情報の取得に失敗しました。'],
      },
    }
  }

  // Verify current password by attempting to sign in
  // Note: Supabase doesn't provide a dedicated password verification API,
  // so we use signInWithPassword. This will refresh the session.
  const { data: signInData, error: verifyError } =
    await supabaseClient.auth.signInWithPassword({
      email: currentUser.email,
      password: passwords.currentPassword,
    })

  if (verifyError || !signInData.session) {
    return {
      errors: {
        currentPassword: ['現在のパスワードが正しくありません。'],
      },
    }
  }

  // Update password using the authenticated session
  const { error } = await supabaseClient.auth.updateUser({
    password: passwords.newPassword,
  })

  if (error) {
    console.error('Password update error:', error)
    return {
      errors: {
        generic: [
          `パスワードの更新に失敗しました。${error.message ? `(${error.message})` : ''}`,
        ],
      },
    }
  }

  // Log password change (without storing the actual password for security)
  await createAuditLog('ACCOUNT_PASSWORD_UPDATE', 'auth.users', currentUser.id)

  revalidatePath('/account')

  return { success: true }
}
