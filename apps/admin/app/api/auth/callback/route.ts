import { type NextRequest, NextResponse } from 'next/server'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/account'

  if (code) {
    const supabaseClient = await createSupabaseServerClient()

    // Exchange code for session
    const { data, error } =
      await supabaseClient.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if this is an email change event
      // Supabase sends the user with the new email after confirmation
      const user = data.user

      // Log the email change to audit log
      // Note: We can't get the old email here, but we log that the change was confirmed
      await createAuditLog('ACCOUNT_EMAIL_UPDATE', 'auth.users', user.id, {
        changes: {
          after: { email: user.email },
        },
        entityName: 'user_email',
      })

      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // If there's an error or no code, redirect to login
  return NextResponse.redirect(new URL('/login', request.url))
}
