import Form, {
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SuccessMessage,
} from '@/components/form'
import { updateUserPassword } from '../_actions'

export function PasswordUpdateForm() {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-xl">パスワードの変更</h2>
      <div className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <Form action={updateUserPassword} className="space-y-4">
          <SuccessMessage
            className="rounded-md bg-green-100 p-2 text-green-800 text-sm leading-normal"
            message="パスワードを更新しました。"
          />

          <GenericErrorMessage className="rounded-md bg-secondary-pink p-2 text-slate-50 text-sm leading-normal" />

          <FormField className="flex flex-col space-y-2" name="currentPassword">
            <Label className="font-medium text-slate-700 aria-disabled:cursor-not-allowed aria-disabled:text-slate-400">
              現在のパスワード
            </Label>
            <Input
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:border-secondary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:border-secondary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
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
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 placeholder:text-slate-300 focus-visible:border-secondary-blue focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              minLength={8}
              placeholder="••••••••"
              required
              type="password"
            />
            <ErrorMessage className="text-secondary-pink text-sm leading-normal" />
          </FormField>

          <Button
            className="rounded-md bg-secondary-blue px-4 py-2 font-semibold text-slate-50 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 active:bg-blue-600 active:shadow-inner disabled:pointer-events-none disabled:bg-blue-400"
            type="submit"
          >
            パスワードを更新
          </Button>
        </Form>
      </div>
    </div>
  )
}
