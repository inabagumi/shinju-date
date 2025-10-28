import type { Metadata } from 'next'
import { ContactForm } from './_components/contact-form'

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

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-primary dark:text-774-nevy-50 mb-4">
          お問い合わせ
        </h1>
        <p className="text-lg text-774-nevy-600 dark:text-774-nevy-300 max-w-2xl mx-auto">
          SHINJU
          DATEについてのご質問、不具合報告、機能要望などがございましたら、
          こちらのフォームからお気軽にお問い合わせください。
        </p>
      </div>

      <ContactForm />
    </main>
  )
}
