import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export const metadata: Metadata = {
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    siteName,
    title: 'プライバシーポリシー',
    type: 'article',
  },
  title: 'プライバシーポリシー',
  twitter: {
    title: `プライバシーポリシー - ${siteName}`,
  },
}

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title="プライバシーポリシー" withBreadcrumbs>
      <div className="prose dark:prose-invert max-w-none">{children}</div>
    </SimpleDocument>
  )
}
