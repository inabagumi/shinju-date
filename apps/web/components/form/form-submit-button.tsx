"use client";

import { Button } from "@shinju-date/ui";
import { useFormStatus } from "react-dom";

/**
 * Submit button for a form. It is disabled and shows a pending label while
 * the form is being submitted.
 */
export const FormSubmitButton = () => {
  const { pending } = useFormStatus();

  return (
    <Button
      className="w-full"
      disabled={pending}
      size="lg"
      type="submit"
      variant="primary"
    >
      {pending ? "送信中..." : "送信する"}
    </Button>
  );
};
