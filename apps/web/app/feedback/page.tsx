import type { Metadata } from 'next'
import { FeedbackForm } from './_components/feedback-form'

export const metadata: Metadata = {
  description:
    'SHINJU DATEへのフィードバックを送信できます。不具合報告や機能要望をお寄せください。',
  openGraph: {
    description:
      'SHINJU DATEへのフィードバックを送信できます。不具合報告や機能要望をお寄せください。',
    title: 'フィードバック - SHINJU DATE',
    type: 'website',
    url: '/feedback',
  },
  title: 'フィードバック',
}

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-bold text-4xl text-primary dark:text-774-nevy-50">
          フィードバック
        </h1>
        <p className="mx-auto max-w-2xl text-774-nevy-600 text-lg dark:text-774-nevy-300">
          SHINJU
          DATEについてのご意見、不具合報告、機能要望などがございましたら、
          こちらのフォームからお気軽にお寄せください。
        </p>
      </div>

      <FeedbackForm />
    </main>
  )
}
