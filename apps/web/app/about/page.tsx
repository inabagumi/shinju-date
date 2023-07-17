import { title as siteName } from '@/lib/constants'
import SimpleDocument from '@/ui/simple-document'
import About from './about.mdx'

const title = `${siteName}とは?`

export const dynamic = 'force-static'
export const revalidate = 120

export const metadata = {
  alternates: {
    canonical: '/about'
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
        <About />
      </div>
    </SimpleDocument>
  )
}
