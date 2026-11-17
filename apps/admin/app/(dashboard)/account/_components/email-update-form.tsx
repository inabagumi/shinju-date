import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
  SuccessMessage,
} from '@/components/form'
import { Panel } from '@/components/panel'
import { updateUserEmail } from '../_actions'

interface Props {
  currentEmail: string
}

export function EmailUpdateForm({ currentEmail }: Props) {
  return (
    <Panel className="max-w-text" title="メールアドレスの変更">
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

        <FormField name="email">
          <Label>新しいメールアドレス</Label>
          <Input placeholder="new-email@example.com" required type="email" />
          <ErrorMessage />
        </FormField>

        <SubmitButton>メールアドレスを更新</SubmitButton>
      </Form>
    </Panel>
  )
}
