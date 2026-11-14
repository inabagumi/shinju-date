'use client'

import { Button } from '@shinju-date/ui'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { TextareaField } from '@/app/_components/form-fields'
import { submitFeedback } from '../_lib/actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      className="w-full"
      disabled={pending}
      size="lg"
      type="submit"
      variant="primary"
    >
      {pending ? '送信中...' : '送信する'}
    </Button>
  )
}

export function FeedbackForm() {
  const [state, formAction, isPending] = useActionState(submitFeedback, null)
  const fieldErrors = isPending ? undefined : state?.fieldErrors
  // React resets the form after the action, so restore the submitted values
  // when it fails. They are absent on success, which clears the form.
  const values = state?.values

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

      <SubmitButton />

      {/* Status Messages */}
      {!isPending && state && (state.success || state.error) && (
        <div
          className={`rounded-container border p-4 ${
            state.success
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-danger/30 bg-danger/10 text-danger'
          }`}
        >
          {state.success ? state.message : state.error}
        </div>
      )}
    </form>
  )
}
