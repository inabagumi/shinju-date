'use client'

import { Button } from '@shinju-date/ui'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  CheckboxField,
  InputField,
  SelectField,
  TextareaField,
} from '@/app/_components/form-fields'
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
  const [state, formAction] = useActionState(submitFeedback, null)
  const [wantsReply, setWantsReply] = useState(false)

  return (
    <div className="mx-auto max-w-2xl">
      <form action={formAction} className="space-y-6">
        {/* Feedback Type */}
        <SelectField label="フィードバック種別" name="type" required>
          <option value="">選択してください</option>
          <option value="bug">不具合の報告</option>
          <option value="feature">機能の要望</option>
          <option value="other">その他</option>
        </SelectField>

        {/* Name */}
        <InputField
          label="お名前（任意）"
          name="name"
          placeholder="お名前をご入力ください"
          type="text"
        />

        {/* Reply Checkbox */}
        <CheckboxField
          checked={wantsReply}
          label="返信を希望する"
          name="wantsReply"
          onChange={(e) => setWantsReply(e.target.checked)}
        />

        {/* Email (conditional) */}
        {wantsReply && (
          <InputField
            label="メールアドレス"
            name="email"
            placeholder="example@example.com"
            required={wantsReply}
            type="email"
          />
        )}

        {/* Message */}
        <TextareaField
          label="フィードバック内容"
          name="message"
          placeholder="フィードバック内容をご記入ください"
          required
          rows={6}
        />

        <SubmitButton />

        {/* Status Messages */}
        {state && (
          <div
            className={`rounded-lg p-4 ${
              state.success
                ? 'border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'border border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}
          >
            {state.success ? state.message : state.error}
          </div>
        )}
      </form>
    </div>
  )
}
