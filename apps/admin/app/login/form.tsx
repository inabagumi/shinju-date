'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import { type Database } from '@shinju-date/schema'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { type SupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { type FormEventHandler, useMemo } from 'react'
import { type Control, useController, useForm } from 'react-hook-form'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import * as yup from 'yup'
import {
  Box,
  Button,
  Center,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  useDisclosure
} from '@/lib/chakra-ui'
import { useErrorMessage } from './error-message'

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
          aria-label={shownPassword ? 'パスワードを隠す' : 'パスワードを表示'}
          icon={shownPassword ? <HiEyeOff /> : <HiEye />}
          onClick={shownPassword ? hidePassword : showPassword}
          variant="link"
        />
      </InputRightElement>
    </InputGroup>
  )
}

export type Props = {
  defaultValues: Partial<Omit<FormData, 'password'>>
}

export default function LoginForm({ defaultValues }: Props): JSX.Element {
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
      maxW="100%"
      method="post"
      noValidate
      onSubmit={onSubmit}
      p="4"
      w="md"
    >
      <Heading as="h1" size="md" textAlign="center">
        Admin UI
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
