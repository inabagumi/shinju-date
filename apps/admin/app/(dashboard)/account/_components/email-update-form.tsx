import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
  SuccessMessage,
} from '@/components/form'
import { updateUserEmail } from '../_actions'

interface Props {
  currentEmail: string
}

export function EmailUpdateForm({ currentEmail }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">メールアドレスの変更</h2>
      <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <Form action={updateUserEmail} className="space-y-4">
          <div className="rounded-md bg-slate-100 p-3">
            <p className="text-sm text-slate-600">
              現在のメールアドレス:{' '}
              <span className="font-medium text-slate-900">{currentEmail}</span>
            </p>
          </div>

          <SuccessMessage
            className="rounded-md bg-green-100 p-2 text-sm leading-normal text-green-800"
            message="確認メールを送信しました。新しいメールアドレスに届いたリンクをクリックして変更を完了してください。"
          />

          <GenericErrorMessage className="bg-secondary-pink rounded-md p-2 text-sm leading-normal text-slate-50" />

          <FormField className="flex flex-col space-y-2" name="email">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              新しいメールアドレス
            </Label>
            <Input
              className="focus-visible:border-secondary-blue w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              placeholder="new-email@example.com"
              required
              type="email"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <SubmitButton
            className="bg-secondary-blue hover:bg-774-blue-800 focus-visible:ring-774-blue-400 active:bg-774-blue-600 disabled:bg-774-blue-400 rounded-md px-4 py-2 font-semibold text-slate-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:shadow-inner disabled:pointer-events-none"
            type="submit"
          >
            メールアドレスを更新
          </SubmitButton>
        </Form>
      </div>
    </div>
  )
}
