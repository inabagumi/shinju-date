import SimpleDocument from '@/components/simple-document'
import { title as siteName } from '@/lib/constants'
import Terms from './terms.mdx'

const title = '利用規約'

export const dynamic = 'force-static'
export const revalidate = 120

export const metadata = {
  alternates: {
    canonical: '/terms'
  },
  openGraph: {
    siteName,
    title,
    type: 'article'
  },
  title,
  twitter: {
    title: `${title} - ${siteName}`
  }
}

export default function NotFound(): JSX.Element {
  return (
    <SimpleDocument title={title} withBreadcrumbs>
      <div className="markdown">
        <Terms />
      </div>
    </SimpleDocument>
  )
}
