import { type Metadata } from 'next'
import { type ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export const dynamic = 'force-static'
export const revalidate = 120

export const metadata: Metadata = {
  alternates: {
    canonical: '/privacy'
  },
  openGraph: {
    siteName,
    title: 'プライバシーポリシー',
    type: 'article'
  },
  title: 'プライバシーポリシー',
  twitter: {
    title: `プライバシーポリシー - ${siteName}`
  }
}

export default function Template({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title="プライバシーポリシー" withBreadcrumbs>
      <div className="markdown">{children}</div>
    </SimpleDocument>
  )
}
