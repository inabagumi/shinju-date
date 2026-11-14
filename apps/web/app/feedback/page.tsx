import type { Metadata } from 'next'
import { FeedbackForm } from './_components/feedback-form'

export const metadata: Metadata = {
  description:
    'SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。',
  openGraph: {
    description:
      'SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。',
    title: '機能要望 - SHINJU DATE',
    type: 'website',
    url: '/feedback',
  },
  title: '機能要望',
}

export default function FeedbackPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="text-primary dark:text-774-nevy-50 mb-4 text-4xl font-bold">
          機能要望
        </h1>
        <p className="text-774-nevy-600 dark:text-774-nevy-300 mx-auto max-w-2xl text-lg">
          SHINJU DATEに追加してほしい機能や改善案がございましたら、
          こちらのフォームからお気軽にお寄せください。
        </p>
        <p className="text-774-nevy-500 dark:text-774-nevy-400 mx-auto mt-4 max-w-2xl text-sm">
          ※いただいたご要望は参考とさせていただきますが、必ずしも対応をお約束するものではございません。
        </p>
      </div>

      <FeedbackForm />
    </main>
  )
}
