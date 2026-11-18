import type { FormState } from "@/lib/form-state";

interface FormStatusProps {
  state: FormState | null | undefined;
}

/**
 * Show the result of a form submission: the success message as a status, or
 * the error as an alert. Renders nothing when there is neither.
 */
export function FormStatus({ state }: FormStatusProps) {
  if (state?.success && state.message) {
    return (
      <div
        className="rounded-container border border-success/30 bg-success/10 p-4 text-success"
        role="status"
      >
        {state.message}
      </div>
    );
  }

  if (state && !state.success && state.error) {
    return (
      <div
        className="rounded-container border border-danger/30 bg-danger/10 p-4 text-danger"
        role="alert"
      >
        {state.error}
      </div>
    );
  }

  return null;
}
