import type { Metadata } from 'next'
import PageHeader from '@/components/page-header'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
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
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader
        breadcrumbs={[{ name: '機能要望' }]}
        description={
          <>
            <p>
              SHINJU
              DATEに追加してほしい機能や改善案がございましたら、こちらのフォームからお気軽にお寄せください。
            </p>
            <p className="text-meta">
              ※いただいたご要望は参考とさせていただきますが、必ずしも対応をお約束するものではございません。
            </p>
          </>
        }
        title="機能要望"
      />

      <div className="max-w-xl">
        <FeedbackForm />
      </div>
    </main>
  )
}
