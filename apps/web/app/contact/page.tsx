import type { Metadata } from 'next'
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
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-12 text-center">
        <h1 className="mb-4 font-bold text-4xl text-primary dark:text-774-nevy-50">
          お問い合わせ
        </h1>
        <p className="mx-auto max-w-2xl text-774-nevy-600 text-lg dark:text-774-nevy-300">
          SHINJU
          DATEについてのご質問、不具合報告、機能要望などがございましたら、
          こちらのフォームからお気軽にお問い合わせください。
        </p>
      </div>

      {enabled ? (
        <ContactForm />
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            お問い合わせ機能は現在ご利用いただけません。設定が完了していないため、一時的に無効になっています。
          </div>
        </div>
      )}
    </main>
  )
}
