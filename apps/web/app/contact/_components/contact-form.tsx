"use client";

import { useActionState, useState } from "react";

import {
  CheckboxField,
  InputField,
  SelectField,
  TextareaField,
} from "@/components/form/form-fields";
import { FormStatus } from "@/components/form/form-status";
import { FormSubmitButton } from "@/components/form/form-submit-button";

import { submitContactForm } from "../_lib/actions";
import type { ContactFormState } from "../_lib/actions";

interface WantsReplyChange {
  checked: boolean;
  state: ContactFormState | null;
}

export const ContactForm = () => {
  const [state, formAction, isPending] = useActionState(
    submitContactForm,
    null
  );
  const fieldErrors = isPending ? undefined : state?.fieldErrors;
  // React resets the form after the action, so restore the submitted values
  // when it fails. They are absent on success, which clears the form.
  const values = state?.values;
  // The checkbox follows the submitted value after each submission and the
  // user's last change in between. Tying the change to the state it was made
  // in keeps the email field in sync with the checkbox after the reset.
  const [wantsReplyChange, setWantsReplyChange] =
    useState<WantsReplyChange | null>(null);
  const wantsReply =
    wantsReplyChange && wantsReplyChange.state === state
      ? wantsReplyChange.checked
      : values?.wantsReply === "on";

  return (
    <form action={formAction} className="space-y-6">
      {/* Contact Type */}
      <SelectField
        defaultValue={values?.type ?? ""}
        error={fieldErrors?.type}
        // React does not apply a changed `defaultValue` to a mounted
        // <select>, so remount it to restore the submitted value.
        key={values?.type ?? ""}
        label="お問い合わせ種別"
        name="type"
        required
      >
        <option value="">選択してください</option>
        <option value="bug">不具合の報告</option>
        <option value="feature">機能の要望</option>
        <option value="other">その他</option>
      </SelectField>

      {/* Name */}
      <InputField
        defaultValue={values?.name}
        label="お名前（任意）"
        name="name"
        placeholder="お名前をご入力ください"
        type="text"
      />

      {/* Reply Checkbox */}
      <CheckboxField
        defaultChecked={values?.wantsReply === "on"}
        label="返信を希望する"
        name="wantsReply"
        onChange={(e) =>
          setWantsReplyChange({ checked: e.target.checked, state })
        }
      />

      {/* Email (conditional) */}
      {wantsReply && (
        <InputField
          defaultValue={values?.email}
          error={fieldErrors?.email}
          label="メールアドレス"
          name="email"
          placeholder="example@example.com"
          required={wantsReply}
          type="email"
        />
      )}

      {/* Message */}
      <TextareaField
        defaultValue={values?.message}
        error={fieldErrors?.message}
        label="お問い合わせ内容"
        name="message"
        placeholder="お問い合わせ内容をご記入ください"
        required
        rows={6}
      />

      <FormSubmitButton />

      <FormStatus state={isPending ? null : state} />
    </form>
  );
};
