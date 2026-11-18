"use client";

import { useActionState } from "react";

import { TextareaField } from "@/components/form/form-fields";
import { FormStatus } from "@/components/form/form-status";
import { FormSubmitButton } from "@/components/form/form-submit-button";

import { submitFeedback } from "../_lib/actions";

export const FeedbackForm = () => {
  const [state, formAction, isPending] = useActionState(submitFeedback, null);
  const fieldErrors = isPending ? undefined : state?.fieldErrors;
  // React resets the form after the action, so restore the submitted values
  // when it fails. They are absent on success, which clears the form.
  const values = state?.values;

  return (
    <form action={formAction} className="space-y-6">
      {/* Message */}
      <TextareaField
        defaultValue={values?.message}
        error={fieldErrors?.message}
        label="機能要望"
        name="message"
        placeholder="追加してほしい機能や改善案をご記入ください"
        required
        rows={8}
      />

      <FormSubmitButton />

      <FormStatus state={isPending ? null : state} />
    </form>
  );
};
