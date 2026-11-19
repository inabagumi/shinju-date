"use client";

import Form, {
  FormField,
  Label,
  SubmitButton,
  SuccessMessage,
  Textarea,
} from "@/components/form";

import { updateFeatureRequestMemoAction } from "../../_actions/update-feedback";

interface FeedbackMemoFormProps {
  adminMemo: string | null;
  id: string;
}

/** 機能要望の管理メモを保存するフォーム */
export const FeedbackMemoForm = ({ adminMemo, id }: FeedbackMemoFormProps) => (
  <Form action={updateFeatureRequestMemoAction} className="space-y-4">
    <input name="id" type="hidden" value={id} />
    <FormField name="admin_memo">
      <Label>メモ（Markdown対応）</Label>
      <Textarea defaultValue={adminMemo ?? ""} rows={8} />
    </FormField>
    <div className="flex flex-wrap items-center gap-3">
      <SubmitButton>メモを保存</SubmitButton>
      <SuccessMessage
        className="text-meta text-success"
        message="保存しました。"
      />
    </div>
  </Form>
);
