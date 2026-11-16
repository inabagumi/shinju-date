import type { Metadata } from 'next'
import { Suspense } from 'react'
import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { LogoIcon } from '@/components/logo-icon'
import { Panel } from '@/components/panel'
import { getSafeRedirectPath, REDIRECT_PARAM } from '@/lib/redirect-path'
import { signIn } from './_lib/actions'

export const metadata: Metadata = {
  title: 'ログイン',
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * ログイン後の戻り先をフォームと一緒に送るための hidden input。
 * `searchParams` はリクエスト時にしか分からないため、フォームの外枠とは
 * 分けて `Suspense` の中で描画する。
 */
async function RedirectPathInput({ searchParams }: Props) {
  const { [REDIRECT_PARAM]: value } = await searchParams
  const redirectPath = getSafeRedirectPath(value)

  if (redirectPath === '/') {
    return null
  }

  return <input name={REDIRECT_PARAM} type="hidden" value={redirectPath} />
}

export default function Login({ searchParams }: Props) {
  return (
    <div className="grid min-h-svh place-items-center bg-background p-4">
      <div className="grid w-full max-w-md gap-6">
        <hgroup className="flex flex-col items-center gap-2 text-center">
          <LogoIcon className="size-12 text-accent" />
          <h1 className="text-title font-bold">Admin UI</h1>
          <p className="text-meta text-muted">SHINJU DATE</p>
        </hgroup>

        <Panel>
          <Form action={signIn} className="grid gap-6">
            <Suspense fallback={null}>
              <RedirectPathInput searchParams={searchParams} />
            </Suspense>

            <GenericErrorMessage className="rounded-control bg-danger/10 p-3 text-meta text-danger" />

            <div className="space-y-4">
              <FormField className="flex flex-col gap-2" name="email">
                <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
                  メールアドレス
                </Label>
                <Input placeholder="admin@example.com" required type="email" />
                <ErrorMessage className="text-meta text-danger" />
              </FormField>
              <FormField className="flex flex-col gap-2" name="password">
                <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
                  パスワード
                </Label>
                <Input
                  minLength={8}
                  placeholder="••••••••"
                  required
                  type="password"
                />
                <ErrorMessage className="text-meta text-danger" />
              </FormField>
            </div>

            <SubmitButton className="w-full" type="submit">
              ログイン
            </SubmitButton>
          </Form>
        </Panel>
      </div>
    </div>
  )
}
