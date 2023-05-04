import './globals.css'
import { type Session } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type ReactNode } from 'react'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { createSupabaseClient } from '@/lib/supabase'
import { lato } from './fonts'
import Provider from './provider'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Admin UI - SHINJU DATE'
}

type Props = {
  children: ReactNode
}

export default async function RootLayout({ children }: Props) {
  const cookieStore = cookies()
  const sessionID = cookieStore.get(SESSION_ID_COOKIE_KEY)?.value

  let session: Session | undefined
  if (sessionID) {
    const supabaseClient = createSupabaseClient({ sessionID })
    const { data, error } = await supabaseClient.auth.getSession()

    if (!error && data.session) {
      session = data.session
    }
  }

  return (
    <html className={lato.variable} lang="ja">
      <body>
        <Provider session={session}>{children}</Provider>
      </body>
    </html>
  )
}
