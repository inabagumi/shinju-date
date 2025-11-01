'use server'

import { revalidatePath } from 'next/cache'
import * as z from 'zod/v3'
import type { FormState } from '@/components/form'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

const emailSchema = z.object({
  email: z
    .string({
      invalid_type_error: 'メールアドレスの形式が正しくありません。',
      required_error: 'メールアドレスは必須です。',
    })
    .email('メールアドレスの形式が正しくありません。'),
})

const passwordSchema = z
  .object({
    confirmPassword: z
      .string({
        invalid_type_error: 'パスワードの形式が正しくありません。',
        required_error: 'パスワードの確認は必須です。',
      })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
    currentPassword: z
      .string({
        invalid_type_error: 'パスワードの形式が正しくありません。',
        required_error: '現在のパスワードは必須です。',
      })
      .min(8, 'パスワードは8文字以上入力する必要があります。'),
    newPassword: z
      .string({
        invalid_type_error: 'パスワードの形式が正しくありません。',
        required_error: '新しいパスワードは必須です。',
      })
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
      return error.issues.reduce<FormState>(
        ({ errors: previousErrors = {} }, issue) => {
          const name = issue.path.join('.')
          const previousMessages = previousErrors[name] ?? []

          return {
            errors: {
              ...previousErrors,
              [name]: [...previousMessages, issue.message],
            },
          }
        },
        {},
      )
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

  const oldEmail = currentUser.email

  // Update email
  const { error } = await supabaseClient.auth.updateUser({
    email: email.email,
  })

  if (error) {
    return {
      errors: {
        generic: ['メールアドレスの更新に失敗しました。'],
      },
    }
  }

  // Log the email change
  await createAuditLog('ACCOUNT_EMAIL_UPDATE', 'auth.users', currentUser.id, {
    changes: {
      after: { email: email.email },
      before: { email: oldEmail },
    },
    entityName: 'user_email',
  })

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
      return error.issues.reduce<FormState>(
        ({ errors: previousErrors = {} }, issue) => {
          const name = issue.path.join('.')
          const previousMessages = previousErrors[name] ?? []

          return {
            errors: {
              ...previousErrors,
              [name]: [...previousMessages, issue.message],
            },
          }
        },
        {},
      )
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
  // so we use signInWithPassword. This will refresh the session but not create a new one.
  const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
    email: currentUser.email,
    password: passwords.currentPassword,
  })

  if (verifyError) {
    return {
      errors: {
        currentPassword: ['現在のパスワードが正しくありません。'],
      },
    }
  }

  // Update password
  const { error } = await supabaseClient.auth.updateUser({
    password: passwords.newPassword,
  })

  if (error) {
    return {
      errors: {
        generic: ['パスワードの更新に失敗しました。'],
      },
    }
  }

  // Log password change (without storing the actual password for security)
  await createAuditLog(
    'ACCOUNT_PASSWORD_UPDATE',
    'auth.users',
    currentUser.id,
    {
      entityName: 'user_password',
    },
  )

  revalidatePath('/account')

  return { success: true }
}
