'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { type FormState } from '@/components/form'
import { createSupabaseClient } from '@/lib/supabase'

export async function signOut(): Promise<FormState> {
  const cookieStore = await cookies()
  const supabaseClient = createSupabaseClient({ cookieStore })
  const { error } = await supabaseClient.auth.signOut()

  if (error) {
    return {
      errors: {
        generic: ['ログアウトに失敗しました。']
      }
    }
  }

  redirect('/login')
}
