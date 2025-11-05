import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export const metadata: Metadata = {
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    siteName,
    title: `${siteName}とは?`,
    type: 'article',
  },
  title: `${siteName}とは?`,
  twitter: {
    title: `${siteName}とは? - ${siteName}`,
  },
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title={`${siteName}とは?`} withBreadcrumbs>
      <div className="prose dark:prose-invert">{children}</div>
    </SimpleDocument>
  )
}
