'use server'

import { createSupabaseClient } from '@shinju-date/supabase'
import { redirect } from 'next/navigation'
import { type FormState } from '@/components/form'

export async function signOut(): Promise<FormState> {
  const supabaseClient = createSupabaseClient()
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
