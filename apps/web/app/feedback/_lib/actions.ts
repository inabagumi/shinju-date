"use server";

import type { TablesInsert } from "@shinju-date/database";
import { z } from "zod";

import { UNEXPECTED_ERROR, withBotCheck } from "@/lib/form-action";
import { toValidationErrorState } from "@/lib/form-state";
import type { FormState } from "@/lib/form-state";
import { supabaseClient } from "@/lib/supabase";

const MESSAGE_REQUIRED_ERROR = "機能要望を入力してください";

const feedbackFormSchema = z.object({
  message: z
    .string({ error: MESSAGE_REQUIRED_ERROR })
    .trim()
    .min(1, MESSAGE_REQUIRED_ERROR),
});

type FeedbackFormField = keyof z.input<typeof feedbackFormSchema>;

export type FeedbackFormState = FormState<FeedbackFormField>;

const FEEDBACK_FORM_FIELDS = [
  "message",
] as const satisfies readonly FeedbackFormField[];

export const submitFeedback = withBotCheck<FeedbackFormField>(
  async (formData, values) => {
    // Parse form data
    const rawData = {
      message: formData.get("message"),
    };

    const result = feedbackFormSchema.safeParse(rawData);

    if (!result.success) {
      return { ...toValidationErrorState(result.error), values };
    }

    const { message } = result.data;

    // Insert feature request into database
    const featureRequestData: TablesInsert<"feature_requests"> = {
      message,
    };

    const { error: insertError } = await supabaseClient
      .from("feature_requests")
      .insert(featureRequestData);

    if (insertError) {
      console.error("Feature request submission error:", insertError);
      return { error: UNEXPECTED_ERROR, success: false, values };
    }

    return {
      message: "機能要望を受け付けました。ありがとうございます。",
      success: true,
    };
  },
  {
    errorLogMessage: "Feature request form submission error:",
    fields: FEEDBACK_FORM_FIELDS,
  }
);
