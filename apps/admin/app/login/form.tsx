'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import {
  Box,
  Button,
  Center,
  FormControl,
  FormLabel,
  type HTMLChakraProps,
  Heading,
  IconButton,
  Input,
  InputGroup,
  InputRightElement,
  chakra,
  useDisclosure
} from '@shinju-date/chakra-ui'
import { useRouter } from 'next/navigation'
import {
  type FormEventHandler,
  forwardRef,
  useCallback,
  useMemo,
  useState
} from 'react'
import {
  type SubmitErrorHandler,
  type SubmitHandler,
  type UseControllerProps,
  useController,
  useForm
} from 'react-hook-form'
import { HiEye, HiEyeOff } from 'react-icons/hi'
import * as yup from 'yup'
import { useAuth } from '@/app/session'
import { LOGIN_FAILED_MESSAGE } from '@/lib/constants'
import { loginFormDataSchema } from '@/lib/schemas'
import { useErrorMessage } from './error-message'

type LoginFormData = yup.InferType<typeof loginFormDataSchema>

export function PasswordField<N extends keyof LoginFormData>(
  props: UseControllerProps<LoginFormData, N>
): JSX.Element {
  const { field } = useController(props)
  const {
    isOpen: shownPassword,
    onClose: hidePassword,
    onOpen: showPassword
  } = useDisclosure()

  return (
    <InputGroup>
      <Input
        autoComplete="current-password"
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

type LegendLabelProps = HTMLChakraProps<'label'>

export const LegendLabel = forwardRef<HTMLLabelElement, LegendLabelProps>(
  function LegendLabel(props, ref) {
    return (
      <chakra.legend display="contents">
        <chakra.label {...props} ref={ref} />
      </chakra.legend>
    )
  }
)

export type Props = {
  defaultValues: Partial<Omit<LoginFormData, 'password'>>
  disabled?: boolean
  redirectTo?: string
}

export default function LoginForm({
  defaultValues,
  disabled = false,
  redirectTo = '/'
}: Props): JSX.Element {
  const router = useRouter()
  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormData>({
    defaultValues,
    resolver: yupResolver(loginFormDataSchema)
  })
  const { setErrorMessage } = useErrorMessage()
  const [isDisabled, setIsDisabled] = useState(disabled)
  const { signIn } = useAuth()

  const submitHandler = useCallback<SubmitHandler<LoginFormData>>(
    async ({ email, password }) => {
      try {
        await signIn({ email, password })
      } catch {
        setErrorMessage(LOGIN_FAILED_MESSAGE)

        return
      }

      setIsDisabled(true)
      router.push(redirectTo)
    },
    [redirectTo, router, signIn, setErrorMessage]
  )
  const subimitErrorHandler = useCallback<
    SubmitErrorHandler<LoginFormData>
  >(() => {
    setErrorMessage(LOGIN_FAILED_MESSAGE)
  }, [setErrorMessage])
  const onSubmit = useMemo<FormEventHandler>(
    () => handleSubmit(submitHandler, subimitErrorHandler),
    [submitHandler, subimitErrorHandler, handleSubmit]
  )

  return (
    <Box
      as="form"
      borderRadius="lg"
      borderWidth={1}
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

      <FormControl as="fieldset" isReadOnly={isDisabled}>
        <FormLabel as={LegendLabel} fontSize="sm">
          メールアドレス
        </FormLabel>
        <Input autoComplete="email" type="email" {...register('email')} />
      </FormControl>

      <FormControl as="fieldset" isReadOnly={isDisabled} mt={6}>
        <FormLabel as={LegendLabel} fontSize="sm">
          パスワード
        </FormLabel>

        <PasswordField control={control} defaultValue="" name="password" />
      </FormControl>

      <Center mt={6}>
        <Button
          colorScheme="blue"
          isLoading={isSubmitting || isDisabled}
          type="submit"
          width="full"
        >
          ログイン
        </Button>
      </Center>
    </Box>
  )
}
