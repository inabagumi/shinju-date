'use client'

import { yupResolver } from '@hookform/resolvers/yup'
import { useRouter } from 'next/navigation'
import { type FormEventHandler, useCallback, useMemo, useState } from 'react'
import {
  type SubmitErrorHandler,
  type SubmitHandler,
  useForm
} from 'react-hook-form'
import * as yup from 'yup'
import { useAuth } from '@/app/session'
import { LOGIN_FAILED_MESSAGE } from '@/lib/constants'
import { loginFormDataSchema } from '@/lib/schemas'
import styles from './form.module.css'

type LoginFormData = yup.InferType<typeof loginFormDataSchema>

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
    formState: { isSubmitting },
    handleSubmit,
    register
  } = useForm<LoginFormData>({
    defaultValues,
    resolver: yupResolver(loginFormDataSchema)
  })
  const [isDisabled, setIsDisabled] = useState(disabled)
  const { signIn } = useAuth()

  const submitHandler = useCallback<SubmitHandler<LoginFormData>>(
    async ({ email, password }) => {
      try {
        await signIn({ email, password })
      } catch {
        alert(LOGIN_FAILED_MESSAGE)

        return
      }

      setIsDisabled(true)
      router.push(redirectTo)
    },
    [redirectTo, router, signIn]
  )
  const subimitErrorHandler = useCallback<
    SubmitErrorHandler<LoginFormData>
  >(() => {
    alert(LOGIN_FAILED_MESSAGE)
  }, [])
  const onSubmit = useMemo<FormEventHandler>(
    () => handleSubmit(submitHandler, subimitErrorHandler),
    [submitHandler, subimitErrorHandler, handleSubmit]
  )

  return (
    <form className={styles.form} method="post" noValidate onSubmit={onSubmit}>
      <h1 className={styles.heading}>Admin UI</h1>

      <fieldset className={styles.formGroup} disabled={isDisabled}>
        <legend className={styles.formLabel}>
          <label className={styles.label} htmlFor="login-form-email">
            メールアドレス
          </label>
        </legend>

        <input
          autoComplete="email"
          className={styles.textField}
          id="login-form-email"
          type="email"
          {...register('email')}
        />
      </fieldset>

      <fieldset className={styles.formGroup} disabled={isDisabled}>
        <legend className={styles.formLabel}>
          <label className={styles.label} htmlFor="login-form-password">
            パスワード
          </label>
        </legend>

        <input
          autoComplete="current-password"
          className={styles.textField}
          id="login-form-password"
          type="password"
          {...register('password')}
        />
      </fieldset>

      <button
        className={styles.submitButton}
        disabled={isSubmitting || isDisabled}
        type="submit"
      >
        ログイン
      </button>
    </form>
  )
}
