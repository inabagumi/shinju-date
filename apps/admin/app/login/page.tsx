import { redirect } from 'next/navigation'
import { AbsoluteCenter, Container } from '@/lib/chakra-ui'
import { createSupabaseClient } from '@/lib/supabase/server'
import ErrorMessage, { ErrorMessageProvider } from './error-message'
import LoginForm from './form'

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
    <ErrorMessageProvider message={message}>
      <Container maxW="100%" minH="100lvh" pos="relative" w="container.lg">
        <ErrorMessage />

        <AbsoluteCenter maxW="100%" p={4}>
          <LoginForm defaultValues={{ email }} />
        </AbsoluteCenter>
      </Container>
    </ErrorMessageProvider>
  )
}
