import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase'
import { EmailUpdateForm } from './_components/email-update-form'
import { PasswordUpdateForm } from './_components/password-update-form'

export const metadata: Metadata = {
  title: 'アカウント設定',
}

async function UserEmailData() {
  'use cache: private'
  cacheLife('seconds')

  const supabaseClient = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabaseClient.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return <EmailUpdateForm currentEmail={user.email ?? ''} />
}

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Static header */}
      <div>
        <h1 className="font-bold text-3xl">アカウント設定</h1>
        <p className="mt-2 text-slate-600">
          ログイン情報を管理し、アカウントのセキュリティを維持します。
        </p>
      </div>

      {/* Email form - requires user data */}
      <Suspense
        fallback={<div className="h-48 animate-pulse rounded-lg bg-gray-200" />}
      >
        <UserEmailData />
      </Suspense>

      {/* Password form - static component */}
      <PasswordUpdateForm />
    </div>
  )
}
