'use client'

import { type Database } from '@shinju-date/schema'
import {
  type Session,
  type SignInWithPasswordCredentials,
  SupabaseClient
} from '@supabase/supabase-js'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { createSupabaseClient } from '@/lib/supabase/client'

export type SessionValues = {
  supabaseClient?: SupabaseClient<Database>
}

export const SessionContext = createContext<SessionValues>({})

export function useSupabaseClient(): SupabaseClient<Database> {
  const { supabaseClient } = useContext(SessionContext)

  if (!supabaseClient) {
    throw new TypeError('Supabase client has not yet been initialized.')
  }

  return supabaseClient
}

type SignInFn = (creadentials: SignInWithPasswordCredentials) => Promise<void>
type SignOutFn = () => Promise<void>
type UseAuth = {
  signIn: SignInFn
  signOut: SignOutFn
  signedIn?: boolean
}

export function useAuth(): UseAuth {
  const { auth } = useSupabaseClient()
  const [signedIn, setSignedIn] = useState<boolean>()

  const signIn = useCallback<SignInFn>(
    async (credentials) => {
      const {
        data: { session: newSession },
        error
      } = await auth.signInWithPassword(credentials)

      if (error) {
        throw error
      }

      if (!newSession) {
        throw new TypeError('Login failed.')
      }
    },
    [auth]
  )
  const signOut = useCallback<SignOutFn>(async () => {
    const { error } = await auth.signOut()

    if (error) {
      throw error
    }
  }, [auth])

  useEffect(() => {
    auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          throw error
        }

        return session
      })
      .then((session) => {
        if (!session) {
          throw new TypeError('Session does not exist.')
        }

        setSignedIn(true)
      })
      .catch(() => {
        setSignedIn(false)
      })
  }, [auth])

  return { signIn, signOut, signedIn }
}

export type SupabaseProviderProps = {
  children: ReactNode
  session?: Session
}

export function SessionProvider({
  children,
  session
}: SupabaseProviderProps): JSX.Element {
  const supabaseClient = useMemo(
    () => createSupabaseClient({ session }),
    [session]
  )

  return (
    <SessionContext.Provider value={{ supabaseClient }}>
      {children}
    </SessionContext.Provider>
  )
}
