import PageHeader from '@/components/page-header'
import PageMain from '@/components/page-main'
import { createPageMetadata } from '@/lib/metadata'
import { ContactForm } from './_components/contact-form'
import { isContactFormEnabled } from './_lib/utils'

const TITLE = 'お問い合わせ'

export const metadata = createPageMetadata({
  description:
    'SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。',
  path: '/contact',
  title: TITLE,
})

export default async function ContactPage() {
  const enabled = isContactFormEnabled()

  return (
    <PageMain>
      <PageHeader
        breadcrumbs={[{ name: TITLE }]}
        description={
          <p>
            SHINJU
            DATEについてのご質問、不具合報告、機能要望などがございましたら、こちらのフォームからお気軽にお問い合わせください。
          </p>
        }
        title={TITLE}
      />

      <div className="max-w-xl">
        {enabled ? (
          <ContactForm />
        ) : (
          <div className="rounded-container bg-warning/10 p-4 text-body text-warning">
            お問い合わせ機能は現在ご利用いただけません。設定が完了していないため、一時的に無効になっています。
          </div>
        )}
      </div>
    </PageMain>
  )
}
