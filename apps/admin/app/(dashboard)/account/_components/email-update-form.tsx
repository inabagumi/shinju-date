import { Skeleton } from "@shinju-date/ui";

import Form, {
  ErrorMessage,
  FormField,
  Input,
  Label,
  SubmitButton,
  SuccessMessage,
} from "@/components/form";
import { Panel, PanelSkeleton } from "@/components/panel";

import { updateUserEmailAction } from "../_actions";

interface Props {
  currentEmail: string;
}

export function EmailUpdateForm({ currentEmail }: Props) {
  return (
    <Panel className="max-w-text" title="メールアドレスの変更">
      <Form action={updateUserEmailAction} className="space-y-4">
        <div className="rounded-control bg-muted p-3">
          <p className="text-meta text-muted">
            現在のメールアドレス:{" "}
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
  );
}

/** 読み込み中の `EmailUpdateForm`。現在のメールアドレス、入力欄、更新のボタンを並べる */
export function EmailUpdateFormSkeleton() {
  return (
    <PanelSkeleton className="max-w-text" title="メールアドレスの変更">
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
    </PanelSkeleton>
  );
}
