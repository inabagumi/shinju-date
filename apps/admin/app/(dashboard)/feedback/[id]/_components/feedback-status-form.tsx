"use client";

import Form, {
  FormField,
  Label,
  Select,
  SubmitButton,
  SuccessMessage,
} from "@/components/form";

import { updateFeatureRequestStatusAction } from "../../_actions/update-feedback";
import {
  FEATURE_REQUEST_STATUS_LABELS,
  FEATURE_REQUEST_STATUSES,
} from "../../_lib/feature-request-status";
import type { FeatureRequestStatus } from "../../_lib/feature-request-status";

interface FeedbackStatusFormProps {
  id: string;
  status: FeatureRequestStatus;
}

/** 機能要望の対応ステータスを変えるフォーム */
export function FeedbackStatusForm({ id, status }: FeedbackStatusFormProps) {
  return (
    <Form action={updateFeatureRequestStatusAction} className="space-y-4">
      <input name="id" type="hidden" value={id} />
      <FormField name="status">
        <Label>対応ステータス</Label>
        <Select defaultValue={status}>
          {FEATURE_REQUEST_STATUSES.map((value) => (
            <option key={value} value={value}>
              {FEATURE_REQUEST_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </FormField>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>ステータスを更新</SubmitButton>
        <SuccessMessage
          className="text-meta text-success"
          message="更新しました。"
        />
      </div>
    </Form>
  );
}
