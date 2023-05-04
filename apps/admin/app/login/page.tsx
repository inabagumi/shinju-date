import { normalizePath } from '@shinju-date/helpers'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { createSupabaseClient } from '@/lib/supabase'
import LoginForm from './form'
import styles from './page.module.css'

// export const runtime = 'edge'

type SearchParams = {
  email?: string | string[]
  message?: string | string[]
  return?: string | string[]
}

type Props = {
  searchParams: SearchParams
}

export default async function Login({ searchParams }: Props) {
  const returnTo = Array.isArray(searchParams.return)
    ? searchParams.return[0]
    : searchParams.return
  const redirectTo = normalizePath(returnTo)
  const cookieStore = cookies()
  const sessionID = cookieStore.get(SESSION_ID_COOKIE_KEY)?.value

  if (sessionID) {
    const supabaseClient = createSupabaseClient({ sessionID })
    const {
      data: { session },
      error
    } = await supabaseClient.auth.getSession()

    if (!error && session) {
      redirect(redirectTo)
    }
  }

  const email = Array.isArray(searchParams.email)
    ? searchParams.email[0]
    : searchParams.email

  return (
    <div className={styles.container}>
      <LoginForm defaultValues={{ email }} redirectTo={redirectTo} />
    </div>
  )
}
