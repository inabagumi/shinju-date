"use server";

import { revalidatePath } from "next/cache";

import { ActionError, adminFormAction } from "@/lib/action";
import { createAuditLog } from "@/lib/audit-log";

import { createEntityNameFromMessage } from "../_lib/create-entity-name-from-message";
import {
  FEEDBACK_FORM_FIELDS,
  feedbackMemoFormSchema,
  feedbackReadFormSchema,
  feedbackStatusFormSchema,
} from "../_lib/feedback-form-schema";

const NOT_FOUND_ERROR = "フィードバックが見つかりませんでした。";

const FORM_OPTIONS = { hiddenFields: FEEDBACK_FORM_FIELDS };

/**
 * 一覧と詳細の両方のページを再検証する。詳細のページは、状態・メモ・既読を
 * `getFeatureRequestById` の結果から表示するので、一覧だけでは古い値が残る
 */
function revalidateFeatureRequest(id: string): void {
  revalidatePath("/feedback");
  revalidatePath(`/feedback/${id}`);
}

export const updateFeatureRequestStatusAction = adminFormAction(
  "updateFeatureRequestStatusAction",
  feedbackStatusFormSchema,
  async ({ supabaseClient }, { id, status }) => {
    const { data: featureRequest, error: fetchError } = await supabaseClient
      .from("feature_requests")
      .select("message, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!featureRequest) {
      throw new ActionError(NOT_FOUND_ERROR);
    }

    // 状態が変わらないときは、更新も監査ログの記録もしない
    if (featureRequest.status === status) {
      return;
    }

    const { error } = await supabaseClient
      .from("feature_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      throw error;
    }

    await createAuditLog(supabaseClient, "FEATURE_REQUEST_UPDATE", id, {
      changes: {
        after: { status },
        before: { status: featureRequest.status },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    });

    revalidateFeatureRequest(id);
  },
  FORM_OPTIONS
);

export const updateFeatureRequestMemoAction = adminFormAction(
  "updateFeatureRequestMemoAction",
  feedbackMemoFormSchema,
  async ({ supabaseClient }, { admin_memo: adminMemo, id }) => {
    const { data: featureRequest, error: fetchError } = await supabaseClient
      .from("feature_requests")
      .select("admin_memo, message")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!featureRequest) {
      throw new ActionError(NOT_FOUND_ERROR);
    }

    // メモが変わらないときは、更新も監査ログの記録もしない
    if ((featureRequest.admin_memo ?? "") === adminMemo) {
      return;
    }

    const { error } = await supabaseClient
      .from("feature_requests")
      .update({ admin_memo: adminMemo })
      .eq("id", id);

    if (error) {
      throw error;
    }

    // メモは長いので、本文は記録せず、メモがあるかどうかだけを記録する
    await createAuditLog(supabaseClient, "FEATURE_REQUEST_UPDATE", id, {
      changes: {
        after: { hasMemo: adminMemo !== "" },
        before: { hasMemo: Boolean(featureRequest.admin_memo) },
      },
      entityName: createEntityNameFromMessage(featureRequest.message),
    });

    revalidateFeatureRequest(id);
  },
  FORM_OPTIONS
);

export const markFeatureRequestAsReadAction = adminFormAction(
  "markFeatureRequestAsReadAction",
  feedbackReadFormSchema,
  async ({ supabaseClient }, { id, is_read: isRead }) => {
    // 既読は対応の状態ではなく、確認したかどうかの印なので、監査ログには記録しない
    const { error } = await supabaseClient
      .from("feature_requests")
      .update({ is_read: isRead })
      .eq("id", id);

    if (error) {
      throw error;
    }

    revalidateFeatureRequest(id);
  },
  FORM_OPTIONS
);
