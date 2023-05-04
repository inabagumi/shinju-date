'use client'

import { type Session } from '@supabase/supabase-js'
import { type ReactNode } from 'react'
import { SessionProvider } from './session'

type Props = {
  children: ReactNode
  session?: Session
}

export default function Provider({ children, session }: Props) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
