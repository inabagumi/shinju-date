"use server";

import { Resend } from "resend";
import { z } from "zod";

import { UNEXPECTED_ERROR, withBotCheck } from "@/lib/form-action";
import { toValidationErrorState } from "@/lib/form-state";
import type { FormState } from "@/lib/form-state";

import { getContactFormConfig } from "./utils";

const MESSAGE_REQUIRED_ERROR = "お問い合わせ内容を入力してください";

const contactFormSchema = z.object({
  email: z
    .email({ error: "メールアドレスの形式が正しくありません" })
    .optional(),
  message: z
    .string({ error: MESSAGE_REQUIRED_ERROR })
    .trim()
    .min(1, MESSAGE_REQUIRED_ERROR),
  name: z.string().optional(),
  type: z.enum(["bug", "feature", "other"], {
    error: "お問い合わせ種別を選択してください",
  }),
  wantsReply: z.boolean().default(false),
});

type ContactFormField = keyof z.input<typeof contactFormSchema>;

export type ContactFormState = FormState<ContactFormField>;

const CONTACT_FORM_FIELDS = [
  "email",
  "message",
  "name",
  "type",
  "wantsReply",
] as const satisfies readonly ContactFormField[];

/** The reply-to address, with the name when it is given */
const formatReplyTo = (email: string, name: string | undefined): string =>
  name ? `${name} <${email}>` : email;

export const submitContactForm = withBotCheck<ContactFormField>(
  async (formData, values) => {
    // Check if contact form is enabled
    const config = getContactFormConfig();

    if (!config) {
      return {
        error: "お問い合わせ機能は現在ご利用いただけません。",
        success: false,
        values,
      };
    }

    // Parse form data
    const rawData = {
      email: formData.get("email") || undefined,
      message: formData.get("message"),
      name: formData.get("name") || undefined,
      type: formData.get("type"),
      wantsReply: formData.get("wantsReply") === "on",
    };

    // Validate with email requirement if reply is requested
    const validationSchema = rawData.wantsReply
      ? contactFormSchema.refine(
          (data) => data.email && data.email.length > 0,
          {
            message: "返信を希望する場合はメールアドレスが必須です",
            path: ["email"],
          }
        )
      : contactFormSchema;

    const result = validationSchema.safeParse(rawData);

    if (!result.success) {
      return { ...toValidationErrorState(result.error), values };
    }

    const { type, name, wantsReply, email, message } = result.data;

    // Get type label in Japanese
    const typeLabels = {
      bug: "不具合の報告",
      feature: "機能の要望",
      other: "その他",
    };

    const emailSubject = `【SHINJU DATE】お問い合わせ: ${typeLabels[type]}`;
    const emailText = `■ お名前
${name || "（未入力）"}

■ お問い合わせ内容
${message}

---
このメールはSHINJU DATEのお問い合わせフォームから自動送信されました。`;

    // Set up reply-to with name and email if both available and reply requested
    const replyToValue =
      wantsReply && email ? formatReplyTo(email, name) : undefined;

    const resend = new Resend(config.resendApiKey);

    // The Resend SDK does not throw on API or network errors; it returns
    // them as `error` instead, so check it explicitly.
    const { error: sendError } = await resend.emails.send({
      from: config.fromEmail,
      subject: emailSubject,
      text: emailText,
      to: config.adminEmail,
      ...(replyToValue && { replyTo: replyToValue }),
    });

    if (sendError) {
      console.error("Failed to send contact form email:", sendError);

      return { error: UNEXPECTED_ERROR, success: false, values };
    }

    return {
      message: "お問い合わせを受け付けました。ありがとうございます。",
      success: true,
    };
  },
  {
    errorLogMessage: "Contact form submission error:",
    fields: CONTACT_FORM_FIELDS,
  }
);
