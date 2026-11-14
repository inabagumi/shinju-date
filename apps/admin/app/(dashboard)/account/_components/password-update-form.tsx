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
    <section className="max-w-text rounded-container border border-border bg-surface p-6">
      <h2 className="mb-4 text-heading font-bold">パスワードの変更</h2>
      <Form action={updateUserPassword} className="space-y-4">
        <SuccessMessage
          className="rounded-control bg-success/10 p-3 text-meta text-success"
          message="パスワードを更新しました。"
        />

        <GenericErrorMessage className="rounded-control bg-danger/10 p-3 text-meta text-danger" />

        <FormField className="flex flex-col gap-2" name="currentPassword">
          <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
            現在のパスワード
          </Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage className="text-meta text-danger" />
        </FormField>

        <FormField className="flex flex-col gap-2" name="newPassword">
          <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
            新しいパスワード
          </Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage className="text-meta text-danger" />
        </FormField>

        <FormField className="flex flex-col gap-2" name="confirmPassword">
          <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
            新しいパスワード（確認）
          </Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage className="text-meta text-danger" />
        </FormField>

        <SubmitButton type="submit">パスワードを更新</SubmitButton>
      </Form>
    </section>
  )
}
