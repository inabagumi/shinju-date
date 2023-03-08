import { Container, Flex } from '@shinju-date/chakra-ui'
import { redirect } from 'next/navigation'
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
      <Container maxW="100%" pos="relative" w="container.lg">
        <ErrorMessage left={0} pos="absolute" right={0} top={0} />

        <Flex align="center" justify="center" minH="100dvh" p={4} w="100%">
          <LoginForm defaultValues={{ email }} />
        </Flex>
      </Container>
    </ErrorMessageProvider>
  )
}
