import { checkBotId } from "botid/server";

import { getFormValues } from "@/lib/form-state";
import type { FormState } from "@/lib/form-state";

export const BOT_DETECTED_ERROR =
  "送信を完了できませんでした。しばらく時間をおいて再度お試しください。";

export const UNEXPECTED_ERROR =
  "送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。";

export interface WithBotCheckOptions<FieldName extends string> {
  /** Fields whose submitted values are returned when the submission fails. */
  fields: readonly FieldName[];
  /** Prefix of the log written when the action throws. */
  errorLogMessage: string;
}

/**
 * The body of a form action. `values` holds the submitted values of the
 * fields, to return on failure so the form can restore what the user entered.
 */
export type FormActionHandler<FieldName extends string> = (
  formData: FormData,
  values: Partial<Record<FieldName, string>>
) => Promise<FormState<FieldName>>;

/**
 * Wrap a form action for `useActionState`.
 *
 * Bots are rejected with a fixed failure before the action runs. An error
 * thrown by the action is logged and turned into a generic failure. Both keep
 * the submitted values.
 */
export const withBotCheck =
  <FieldName extends string>(
    action: FormActionHandler<FieldName>,
    { errorLogMessage, fields }: WithBotCheckOptions<FieldName>
  ): ((
    prevState: unknown,
    formData: FormData
  ) => Promise<FormState<FieldName>>) =>
  async (_prevState, formData) => {
    const values = getFormValues(formData, fields);

    try {
      // In local development, checkBotId() always returns isBot: false
      // unless developmentOptions.bypass is set.
      const verification = await checkBotId({
        advancedOptions: {
          checkLevel: "basic",
        },
      });

      if (verification.isBot) {
        return { error: BOT_DETECTED_ERROR, success: false, values };
      }

      return await action(formData, values);
    } catch (error) {
      console.error(errorLogMessage, error);

      return { error: UNEXPECTED_ERROR, success: false, values };
    }
  };
