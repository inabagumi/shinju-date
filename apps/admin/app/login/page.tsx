import { redirect } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/server'

// export const runtime = 'edge'

type SearchParams = {
  email?: string | string[]
  message?: string | string[]
}

type Props = {
  searchParams: SearchParams
}

export default async function Login({ searchParams }: Props) {
  const email = Array.isArray(searchParams.email)
    ? searchParams.email[0]
    : searchParams.email
  const message = Array.isArray(searchParams.message)
    ? searchParams.message[0]
    : searchParams.message
  const supabase = createSupabaseClient()
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (!error && session) {
    redirect('/')
  }

  return (
    <>
      <h1>Login</h1>
      {message && <p>{message}</p>}
      <form action="/login/email" encType="multipart/form-data" method="post">
        <fieldset>
          <legend>
            <label htmlFor="email">E-mail</label>
          </legend>

          <input
            defaultValue={email}
            name="email"
            placeholder="example@example.com"
            required
            type="email"
          />
        </fieldset>

        <fieldset>
          <legend>
            <label htmlFor="password">Password</label>
          </legend>

          <input id="password" name="password" required type="password" />
        </fieldset>

        <button type="submit">Login</button>
      </form>
    </>
  )
}
