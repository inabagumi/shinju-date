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
    <section className="max-w-text rounded-container border border-border bg-surface p-6">
      <h2 className="mb-4 text-heading font-bold">メールアドレスの変更</h2>
      <Form action={updateUserEmail} className="space-y-4">
        <div className="rounded-control bg-muted p-3">
          <p className="text-meta text-muted">
            現在のメールアドレス:{' '}
            <span className="font-semibold text-foreground">
              {currentEmail}
            </span>
          </p>
        </div>

        <SuccessMessage
          className="rounded-control bg-success/10 p-3 text-meta text-success"
          message="確認メールを送信しました。新しいメールアドレスに届いたリンクをクリックして変更を完了してください。"
        />

        <GenericErrorMessage className="rounded-control bg-danger/10 p-3 text-meta text-danger" />

        <FormField className="flex flex-col gap-2" name="email">
          <Label className="text-meta font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50">
            新しいメールアドレス
          </Label>
          <Input placeholder="new-email@example.com" required type="email" />
          <ErrorMessage className="text-meta text-danger" />
        </FormField>

        <SubmitButton type="submit">メールアドレスを更新</SubmitButton>
      </Form>
    </section>
  )
}
