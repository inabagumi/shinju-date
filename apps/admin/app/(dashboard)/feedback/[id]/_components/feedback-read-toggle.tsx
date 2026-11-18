"use client";

import Form, { SubmitButton, SuccessMessage } from "@/components/form";

import { markFeatureRequestAsReadAction } from "../../_actions/update-feedback";

interface FeedbackReadToggleProps {
  id: string;
  isRead: boolean;
}

/** 機能要望の既読と未読を切り替えるフォーム */
export const FeedbackReadToggle = ({ id, isRead }: FeedbackReadToggleProps) => (
  <Form action={markFeatureRequestAsReadAction} className="space-y-4">
    <p className="text-meta">現在: {isRead ? "既読" : "未読"}</p>
    <input name="id" type="hidden" value={id} />
    <input name="is_read" type="hidden" value={String(!isRead)} />
    <div className="flex flex-wrap items-center gap-3">
      <SubmitButton variant="secondary">
        {isRead ? "未読にする" : "既読にする"}
      </SubmitButton>
      <SuccessMessage
        className="text-meta text-success"
        message="更新しました。"
      />
    </div>
  </Form>
);
