import { type Metadata } from 'next'
import { type ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export const dynamic = 'force-static'
export const revalidate = 120

export const metadata: Metadata = {
  alternates: {
    canonical: '/about'
  },
  openGraph: {
    siteName,
    title: `${siteName}とは?`,
    type: 'article'
  },
  title: `${siteName}とは?`,
  twitter: {
    title: `${siteName}とは? - ${siteName}`
  }
}

export default function Template({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title={`${siteName}とは?`} withBreadcrumbs>
      <div className="markdown">{children}</div>
    </SimpleDocument>
  )
}
