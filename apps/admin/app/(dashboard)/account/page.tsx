import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PageHeader } from '@/components/page-header'
import { FormCardSkeleton } from '@/components/skeletons'
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
    <div className="mx-auto max-w-7xl p-6">
      {/* Static header */}
      <PageHeader
        description="ログイン情報を管理し、アカウントのセキュリティを維持します。"
        title="アカウント設定"
      />

      <div className="space-y-8">
        {/* Email form - requires user data */}
        <Suspense fallback={<FormCardSkeleton />}>
          <UserEmailData />
        </Suspense>

        {/* Password form - static component */}
        <PasswordUpdateForm />
      </div>
    </div>
  )
}
