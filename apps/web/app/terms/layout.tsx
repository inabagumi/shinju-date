import SimpleDocument from '@/components/simple-document'
import { createPageMetadata } from '@/lib/metadata'

const TITLE = '利用規約'

export const metadata = createPageMetadata({
  path: '/terms',
  title: TITLE,
  type: 'article',
})

export default function TermsLayout({ children }: LayoutProps<'/terms'>) {
  return <SimpleDocument title={TITLE}>{children}</SimpleDocument>
}
