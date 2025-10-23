'use server'

import { redirect } from 'next/navigation'
import * as z from 'zod/v3'
import type { FormState } from '@/components/form'
import { createSupabaseServerClient } from '@/lib/supabase'

const formSchema = z.object({
  email: z
    .string({
      invalid_type_error: 'メールアドレスの形式が正しくありません。',
      required_error: 'メールアドレスは必須です。',
    })
    .email('メールアドレスの形式が正しくありません。'),
  password: z
    .string({
      invalid_type_error: 'パスワードの形式が正しくありません。',
      required_error: 'パスワードは必須です。',
    })
    .min(8, 'パスワードは8文字以上入力する必要があります。'),
})

export async function signIn(
  _currentState: FormState,
  formData: FormData,
): Promise<FormState> {
  let credentials: z.infer<typeof formSchema>

  try {
    credentials = formSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
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
  const { error } = await supabaseClient.auth.signInWithPassword(credentials)

  if (error) {
    return {
      errors: {
        generic: ['メールアドレスかパスワードが正しくありません。'],
      },
    }
  }

  redirect('/')
}
