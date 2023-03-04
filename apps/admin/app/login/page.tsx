import { redirect } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/server'

export default async function Login() {
  const supabase = createSupabaseClient()
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (!error && session) {
    redirect('/')
  }

  return <h1>Login</h1>
}
