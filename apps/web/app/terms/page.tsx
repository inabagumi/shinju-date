import { title as siteName } from '@/lib/constants'
import SimpleDocument from '@/ui/simple-document'
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
