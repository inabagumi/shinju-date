'use client'

import { type Database } from '@shinju-date/schema'
import {
  type Session,
  createBrowserSupabaseClient
} from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'
import { type ReactNode, createContext, useContext, useMemo } from 'react'

export type SessionValues = {
  session?: Session
  supabase?: SupabaseClient<Database>
}

export const SessionContext = createContext<SessionValues>({})

export function useSupabaseClient(): SupabaseClient<Database> | undefined {
  const { supabase } = useContext(SessionContext)

  return supabase
}

export type SupabaseProviderProps = {
  children: ReactNode
  session?: Session
}

export function SessionProvider({
  children,
  session
}: SupabaseProviderProps): JSX.Element {
  const supabase = useMemo(() => createBrowserSupabaseClient<Database>(), [])

  return (
    <SessionContext.Provider value={{ session, supabase }}>
      {children}
    </SessionContext.Provider>
  )
}
