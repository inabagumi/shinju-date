import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
  SuccessMessage,
} from "@/components/form";
import { Panel } from "@/components/panel";

import { updateUserPasswordAction } from "../_actions";

export function PasswordUpdateForm() {
  return (
    <Panel className="max-w-text" title="パスワードの変更">
      <Form action={updateUserPasswordAction} className="space-y-4">
        <SuccessMessage
          className="rounded-control bg-success/10 p-3 text-meta text-success"
          message="パスワードを更新しました。"
        />

        <FormField name="currentPassword">
          <Label>現在のパスワード</Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage />
        </FormField>

        <FormField name="newPassword">
          <Label>新しいパスワード</Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage />
        </FormField>

        <FormField name="confirmPassword">
          <Label>新しいパスワード（確認）</Label>
          <Input
            minLength={8}
            placeholder="••••••••"
            required
            type="password"
          />
          <ErrorMessage />
        </FormField>

        <SubmitButton>パスワードを更新</SubmitButton>
      </Form>
    </Panel>
  );
}
