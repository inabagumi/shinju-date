import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase'
import { EmailUpdateForm } from './_components/email-update-form'
import { PasswordUpdateForm } from './_components/password-update-form'

export const metadata: Metadata = {
  title: 'アカウント設定',
}

export default async function AccountPage() {
  // Mark this page as dynamic (requires runtime rendering for authentication)
  await connection()

  const supabaseClient = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="font-bold text-3xl">アカウント設定</h1>
        <p className="mt-2 text-slate-600">
          ログイン情報を管理し、アカウントのセキュリティを維持します。
        </p>
      </div>

      <EmailUpdateForm currentEmail={user.email ?? ''} />
      <PasswordUpdateForm />
    </div>
  )
}
