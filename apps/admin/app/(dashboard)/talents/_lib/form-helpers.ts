import type * as z from 'zod'
import type { FormState } from '@/components/form'

/**
 * Converts ZodError to FormState errors format
 */
export function zodErrorToFormState(error: z.ZodError): FormState {
  return error.issues.reduce<FormState>(
    ({ errors: previousErrors = {} }, issue) => {
      const name = issue.path.join('.')
      const previousMessages = previousErrors[name] ?? []

      return {
        errors: {
          ...previousErrors,
          [name]: [...previousMessages, issue.message],
        },
      }
    },
    {},
  )
}
