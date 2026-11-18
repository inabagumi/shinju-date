import { z } from "zod";

export interface FormState<FieldName extends string = string> {
  error?: string;
  fieldErrors?: Partial<Record<FieldName, string>>;
  message?: string;
  success: boolean;
  /**
   * Submitted values to restore when the submission fails. React resets
   * uncontrolled fields after a form action completes, so forms pass these to
   * `defaultValue` to keep what the user entered.
   */
  values?: Partial<Record<FieldName, string>>;
}

/**
 * Pick the string values of the given fields from `formData`.
 *
 * Fields that are missing or hold a file are left out.
 */
export function getFormValues<FieldName extends string>(
  formData: FormData,
  fieldNames: readonly FieldName[]
): Partial<Record<FieldName, string>> {
  const values: Partial<Record<FieldName, string>> = {};

  for (const fieldName of fieldNames) {
    const value = formData.get(fieldName);

    if (typeof value === "string") {
      values[fieldName] = value;
    }
  }

  return values;
}

/**
 * Convert a Zod validation error into a `FormState`.
 *
 * Issues tied to a field are returned in `fieldErrors` (first message per
 * field) so they can be shown next to the field. Issues without a field are
 * joined into `error`.
 */
export function toValidationErrorState<FieldName extends string>(
  error: z.ZodError
): FormState<FieldName> {
  const { fieldErrors, formErrors } = z.flattenError(error);
  const firstFieldErrors: Partial<Record<FieldName, string>> = {};

  for (const [field, messages] of Object.entries(fieldErrors) as [
    FieldName,
    string[] | undefined,
  ][]) {
    const [firstMessage] = messages ?? [];

    if (firstMessage) {
      firstFieldErrors[field] = firstMessage;
    }
  }

  return {
    ...(formErrors.length > 0 && { error: formErrors.join(", ") }),
    fieldErrors: firstFieldErrors,
    success: false,
  };
}
