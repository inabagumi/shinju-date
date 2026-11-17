import { SITE_NAME } from '@shinju-date/constants'
import type { Metadata } from 'next'
import SimpleDocument from '@/components/simple-document'
import { createPageMetadata } from '@/lib/metadata'

const TITLE = `${SITE_NAME}とは?`

export const metadata: Metadata = createPageMetadata({
  path: '/about',
  title: TITLE,
  type: 'article',
})

export default function AboutLayout({ children }: LayoutProps<'/about'>) {
  return <SimpleDocument title={TITLE}>{children}</SimpleDocument>
}
