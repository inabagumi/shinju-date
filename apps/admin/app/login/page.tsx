import { redirect } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase/server'
import Content from './content'

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

  return <Content defaultValues={{ email }} message={message} />
}
