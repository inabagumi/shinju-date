import type { ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@shinju-date/constants'

export const metadata = {
  alternates: {
    canonical: '/terms',
  },
  openGraph: {
    siteName,
    title: '利用規約',
    type: 'article',
  },
  title: '利用規約',
  twitter: {
    title: `利用規約 - ${siteName}`,
  },
}

export default function TermsLayout({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title="利用規約" withBreadcrumbs>
      <div className="prose dark:prose-invert max-w-none">{children}</div>
    </SimpleDocument>
  )
}
