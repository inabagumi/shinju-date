import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
  SuccessMessage,
} from '@/components/form'
import { updateUserPassword } from '../_actions'

export function PasswordUpdateForm() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">パスワードの変更</h2>
      <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <Form action={updateUserPassword} className="space-y-4">
          <SuccessMessage
            className="rounded-md bg-green-100 p-2 text-sm leading-normal text-green-800"
            message="パスワードを更新しました。"
          />

          <GenericErrorMessage className="bg-secondary-pink rounded-md p-2 text-sm leading-normal text-slate-50" />

          <FormField className="flex flex-col space-y-2" name="currentPassword">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              現在のパスワード
            </Label>
            <Input
              className="focus-visible:border-secondary-blue w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              minLength={8}
              placeholder="••••••••"
              required
              type="password"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <FormField className="flex flex-col space-y-2" name="newPassword">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              新しいパスワード
            </Label>
            <Input
              className="focus-visible:border-secondary-blue w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              minLength={8}
              placeholder="••••••••"
              required
              type="password"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <FormField className="flex flex-col space-y-2" name="confirmPassword">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              新しいパスワード（確認）
            </Label>
            <Input
              className="focus-visible:border-secondary-blue w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              minLength={8}
              placeholder="••••••••"
              required
              type="password"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <SubmitButton
            className="bg-secondary-blue hover:bg-774-blue-800 focus-visible:ring-774-blue-400 active:bg-774-blue-600 disabled:bg-774-blue-400 rounded-md px-4 py-2 font-semibold text-slate-50 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:shadow-inner disabled:pointer-events-none"
            type="submit"
          >
            パスワードを更新
          </SubmitButton>
        </Form>
      </div>
    </div>
  )
}
