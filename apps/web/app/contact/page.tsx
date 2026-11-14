import type { Metadata } from 'next'
import PageHeader from '@/components/page-header'
import { MAIN_CONTENT_ID } from '@/components/skip-link'
import { ContactForm } from './_components/contact-form'
import { isContactFormEnabled } from './_lib/utils'

export const metadata: Metadata = {
  description:
    'SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。',
  openGraph: {
    description:
      'SHINJU DATEに関するお問い合わせフォームです。不具合報告や機能要望をお寄せください。',
    title: 'お問い合わせ - SHINJU DATE',
    type: 'website',
    url: '/contact',
  },
  title: 'お問い合わせ',
}

export default async function ContactPage() {
  const enabled = isContactFormEnabled()

  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader
        breadcrumbs={[{ name: 'お問い合わせ' }]}
        description={
          <p>
            SHINJU
            DATEについてのご質問、不具合報告、機能要望などがございましたら、こちらのフォームからお気軽にお問い合わせください。
          </p>
        }
        title="お問い合わせ"
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
    </main>
  )
}
