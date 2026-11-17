import PageHeader from '@/components/page-header'
import PageMain from '@/components/page-main'
import { createPageMetadata } from '@/lib/metadata'
import { FeedbackForm } from './_components/feedback-form'

const TITLE = '機能要望'

export const metadata = createPageMetadata({
  description:
    'SHINJU DATEへの機能要望を送信できます。こんな機能があったらいいな、というアイデアをお寄せください。',
  path: '/feedback',
  title: TITLE,
})

export default function FeedbackPage() {
  return (
    <PageMain>
      <PageHeader
        breadcrumbs={[{ name: TITLE }]}
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
        title={TITLE}
      />

      <div className="max-w-xl">
        <FeedbackForm />
      </div>
    </PageMain>
  )
}
