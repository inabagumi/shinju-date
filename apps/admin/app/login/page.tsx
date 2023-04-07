import { Container, Flex } from '@shinju-date/chakra-ui'
import { normalizePath } from '@shinju-date/helpers'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_ID_COOKIE_KEY } from '@/lib/constants'
import { createSupabaseClient } from '@/lib/supabase'
import ErrorMessage, { ErrorMessageProvider } from './error-message'
import LoginForm from './form'

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
  const message = Array.isArray(searchParams.message)
    ? searchParams.message[0]
    : searchParams.message

  return (
    <ErrorMessageProvider message={message}>
      <Container maxW="100%" pos="relative" w="container.lg">
        <ErrorMessage left={0} pos="absolute" right={0} top={0} />

        <Flex align="center" justify="center" minH="100dvh" p={4} w="100%">
          <LoginForm defaultValues={{ email }} redirectTo={redirectTo} />
        </Flex>
      </Container>
    </ErrorMessageProvider>
  )
}
