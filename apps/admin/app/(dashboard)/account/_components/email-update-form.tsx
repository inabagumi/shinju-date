'use client'

import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
} from '@/components/form'
import { updateUserEmail } from '../_actions'

type Props = {
  currentEmail: string
}

export function EmailUpdateForm({ currentEmail }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">メールアドレスの変更</h2>
      <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <Form action={updateUserEmail} className="space-y-4">
          <div className="rounded-md bg-slate-100 p-3">
            <p className="text-slate-600 text-sm">
              現在のメールアドレス:{' '}
              <span className="font-medium text-slate-900">{currentEmail}</span>
            </p>
          </div>

          <GenericErrorMessage className="rounded-md bg-secondary-pink p-2 text-slate-50 text-sm leading-normal" />

          <FormField className="flex flex-col space-y-2" name="email">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              新しいメールアドレス
            </Label>
            <Input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:border-secondary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="new-email@example.com"
              required
              type="email"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <Button
            className="rounded-md bg-secondary-blue px-4 py-2 font-semibold text-slate-50 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 active:bg-blue-600 active:shadow-inner disabled:pointer-events-none disabled:bg-blue-400"
            type="submit"
          >
            メールアドレスを更新
          </Button>
        </Form>
      </div>
    </div>
  )
}
