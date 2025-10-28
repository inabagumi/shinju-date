'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { submitContactForm } from '../_lib/actions'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-774-nevy-600 dark:hover:bg-774-nevy-700"
      disabled={pending}
      type="submit"
    >
      {pending ? '送信中...' : '送信する'}
    </button>
  )
}

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactForm, null)
  const [wantsReply, setWantsReply] = useState(false)

  return (
    <div className="mx-auto max-w-2xl">
      <form action={formAction} className="space-y-6">
        {/* Contact Type */}
        <div>
          <label
            className="block text-sm font-medium text-primary dark:text-774-nevy-50 mb-2"
            htmlFor="type"
          >
            お問い合わせ種別 <span className="text-red-500">*</span>
          </label>
          <select
            className="w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary focus:border-secondary-pink focus:outline-none focus:ring-2 focus:ring-secondary-pink/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50"
            id="type"
            name="type"
            required
          >
            <option value="">選択してください</option>
            <option value="bug">不具合の報告</option>
            <option value="feature">機能の要望</option>
            <option value="other">その他</option>
          </select>
        </div>

        {/* Name */}
        <div>
          <label
            className="block text-sm font-medium text-primary dark:text-774-nevy-50 mb-2"
            htmlFor="name"
          >
            お名前（任意）
          </label>
          <input
            className="w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary placeholder:text-774-nevy-400 focus:border-secondary-pink focus:outline-none focus:ring-2 focus:ring-secondary-pink/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400"
            id="name"
            name="name"
            placeholder="お名前をご入力ください"
            type="text"
          />
        </div>

        {/* Reply Checkbox */}
        <div>
          <label className="flex items-center gap-3">
            <input
              checked={wantsReply}
              className="h-4 w-4 rounded border-774-nevy-300 text-secondary-pink focus:ring-secondary-pink/20 dark:border-zinc-600"
              name="wantsReply"
              onChange={(e) => setWantsReply(e.target.checked)}
              type="checkbox"
            />
            <span className="text-sm text-primary dark:text-774-nevy-50">
              返信を希望する
            </span>
          </label>
        </div>

        {/* Email (conditional) */}
        {wantsReply && (
          <div>
            <label
              className="block text-sm font-medium text-primary dark:text-774-nevy-50 mb-2"
              htmlFor="email"
            >
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary placeholder:text-774-nevy-400 focus:border-secondary-pink focus:outline-none focus:ring-2 focus:ring-secondary-pink/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400"
              id="email"
              name="email"
              placeholder="example@example.com"
              required={wantsReply}
              type="email"
            />
          </div>
        )}

        {/* Message */}
        <div>
          <label
            className="block text-sm font-medium text-primary dark:text-774-nevy-50 mb-2"
            htmlFor="message"
          >
            お問い合わせ内容 <span className="text-red-500">*</span>
          </label>
          <textarea
            className="w-full rounded-lg border border-774-nevy-300 bg-white px-4 py-3 text-primary placeholder:text-774-nevy-400 focus:border-secondary-pink focus:outline-none focus:ring-2 focus:ring-secondary-pink/20 dark:border-zinc-600 dark:bg-zinc-800 dark:text-774-nevy-50 dark:placeholder:text-774-nevy-400"
            id="message"
            name="message"
            placeholder="お問い合わせ内容をご記入ください"
            required
            rows={6}
          />
        </div>

        <SubmitButton />

        {/* Status Messages */}
        {state && (
          <div
            className={`rounded-lg p-4 ${
              state.success
                ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
            }`}
          >
            {state.success ? state.message : state.error}
          </div>
        )}
      </form>
    </div>
  )
}
