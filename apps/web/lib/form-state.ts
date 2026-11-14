import { z } from 'zod'

export interface FormState<FieldName extends string = string> {
  error?: string
  fieldErrors?: Partial<Record<FieldName, string>>
  message?: string
  success: boolean
}

/**
 * Convert a Zod validation error into a `FormState`.
 *
 * Issues tied to a field are returned in `fieldErrors` (first message per
 * field) so they can be shown next to the field. Issues without a field are
 * joined into `error`.
 */
export function toValidationErrorState<FieldName extends string>(
  error: z.ZodError,
): FormState<FieldName> {
  const { fieldErrors, formErrors } = z.flattenError(error)
  const firstFieldErrors: Partial<Record<FieldName, string>> = {}

  for (const [field, messages] of Object.entries(fieldErrors) as [
    FieldName,
    string[] | undefined,
  ][]) {
    const [firstMessage] = messages ?? []

    if (firstMessage) {
      firstFieldErrors[field] = firstMessage
    }
  }

  return {
    ...(formErrors.length > 0 && { error: formErrors.join(', ') }),
    fieldErrors: firstFieldErrors,
    success: false,
  }
}
