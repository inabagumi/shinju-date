'use client'

import {
  AbsoluteCenter,
  Alert,
  AlertIcon,
  Box,
  Button,
  Center,
  Container,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  useDisclosure
} from '@chakra-ui/react'
import { yupResolver } from '@hookform/resolvers/yup'
import { type Database } from '@shinju-date/schema'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import {
  type FormEventHandler,
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react'
import { type Control, useController, useForm } from 'react-hook-form'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import * as yup from 'yup'

const formDataSchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email('メールアドレスが正しくありません')
      .required('メールアドレスが入力されていません'),
    password: yup
      .string()
      .min(8, 'パスワードは8文字以上入力してください')
      .required('パスワードが入力されていません')
  })
  .required()
type FormData = yup.InferType<typeof formDataSchema>

export type ErrorMessageValues = {
  message?: string
  setErrorMessage: (message: string) => void
}
export const ErrorMessageContext = createContext<ErrorMessageValues>({
  setErrorMessage: () => undefined
})

export function useErrorMessage(): ErrorMessageValues {
  return useContext(ErrorMessageContext)
}

type ErrorMessageProviderProps = {
  children: ReactNode
  message?: string
}

export function ErrorMessageProvider({
  children,
  message: defaultMessage
}: ErrorMessageProviderProps): JSX.Element {
  const [message, setRawMessage] = useState(() => defaultMessage)

  const setErrorMessage = useCallback((message: string) => {
    setRawMessage(message)
  }, [])

  return (
    <ErrorMessageContext.Provider value={{ message, setErrorMessage }}>
      {children}
    </ErrorMessageContext.Provider>
  )
}

export type PasswordFieldProps<N extends keyof FormData> = {
  control: Control<FormData, N>
  name: N
}

export function PasswordField<N extends keyof FormData>({
  control,
  name
}: PasswordFieldProps<N>): JSX.Element {
  const {
    field,
    formState: { errors }
  } = useController({ control, name })
  const {
    isOpen: shownPassword,
    onClose: hidePassword,
    onOpen: showPassword
  } = useDisclosure()

  return (
    <InputGroup>
      <Input
        autoComplete="current-password"
        isInvalid={!!errors[name]}
        type={shownPassword ? 'text' : 'password'}
        {...field}
      />
      <InputRightElement>
        <IconButton
          aria-label=""
          icon={shownPassword ? <HiEyeOff /> : <HiEye />}
          onClick={shownPassword ? hidePassword : showPassword}
          variant="link"
        />
      </InputRightElement>
    </InputGroup>
  )
}

export type LoginFormProps = {
  defaultValues: Partial<Omit<FormData, 'password'>>
}

export function LoginForm({ defaultValues }: LoginFormProps): JSX.Element {
  const router = useRouter()
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<FormData>({
    defaultValues,
    resolver: yupResolver(formDataSchema)
  })
  const { setErrorMessage } = useErrorMessage()
  const supabase = useMemo<SupabaseClient<Database>>(
    () => createBrowserSupabaseClient<Database>(),
    []
  )
  const onSubmit = useMemo<FormEventHandler>(
    () =>
      handleSubmit(async ({ email, password }) => {
        const {
          data: { session },
          error
        } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (!error && session) {
          router.push('/')
        } else {
          setErrorMessage('ログインに失敗しました')
        }
      }),
    [handleSubmit, router, setErrorMessage, supabase.auth]
  )

  return (
    <Box
      action="/login/email"
      as="form"
      borderRadius="lg"
      borderWidth={1}
      encType="multipart/form-data"
      maxW="sm"
      method="post"
      noValidate
      onSubmit={onSubmit}
      p="4"
      w="md"
    >
      <Heading as="h1" size="md" textAlign="center">
        ログイン
      </Heading>

      <FormControl isInvalid={!!errors.email} mt={4}>
        <FormLabel>メールアドレス</FormLabel>
        <Input autoComplete="email" type="email" {...register('email')} />
        {errors.email && (
          <FormErrorMessage>{errors.email.message}</FormErrorMessage>
        )}
      </FormControl>

      <FormControl isInvalid={!!errors.password} mt="6">
        <FormLabel>パスワード</FormLabel>

        <PasswordField control={control} name="password" />
        {errors.password && (
          <FormErrorMessage>{errors.password.message}</FormErrorMessage>
        )}
      </FormControl>

      <Center mt={6}>
        <Button isLoading={isSubmitting} type="submit">
          ログイン
        </Button>
      </Center>
    </Box>
  )
}

export function ErrorMessage(): JSX.Element | null {
  const { message } = useErrorMessage()

  if (!message) {
    return null
  }

  return (
    <Box p={4}>
      <Alert status="error">
        <AlertIcon />

        {message}
      </Alert>
    </Box>
  )
}

type Props = {
  defaultValues: Partial<Omit<FormData, 'password'>>
  message?: string
}

export default function LoginContent({
  defaultValues,
  message
}: Props): JSX.Element {
  return (
    <ErrorMessageProvider message={message}>
      <Container maxW="container.lg" minH="100lvh" pos="relative">
        <ErrorMessage />

        <AbsoluteCenter>
          <LoginForm defaultValues={defaultValues} />
        </AbsoluteCenter>
      </Container>
    </ErrorMessageProvider>
  )
}
