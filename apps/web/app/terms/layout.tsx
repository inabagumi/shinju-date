import { type ReactNode } from 'react'
import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'

export const dynamic = 'force-static'

export const metadata = {
  alternates: {
    canonical: '/terms'
  },
  openGraph: {
    siteName,
    title: '利用規約',
    type: 'article'
  },
  title: '利用規約',
  twitter: {
    title: `利用規約 - ${siteName}`
  }
}

export default function Template({ children }: { children: ReactNode }) {
  return (
    <SimpleDocument title="利用規約" withBreadcrumbs>
      <div className="markdown">{children}</div>
    </SimpleDocument>
  )
}
