import merge from 'lodash.merge'
import baseMetadata from '@/app/metadata'
import SimpleDocument from '@/ui/simple-document'
import About from './about.mdx'

const title = 'SHINJU DATEとは?'

export const runtime = 'edge'
export const dynamic = 'force-static'
export const revalidate = 120

export const metadata = merge(baseMetadata, {
  alternates: {
    canonical: '/about'
  },
  openGraph: {
    title,
    type: 'article'
  },
  title,
  twitter: {
    title: `${title} - SHINJU DATE`
  }
})

export default function NotFound(): JSX.Element {
  return (
    <SimpleDocument title={title} withBreadcrumbs>
      <div className="markdown">
        <About />
      </div>
    </SimpleDocument>
  )
}
