import { type Metadata } from 'next'
import SimpleDocument from '@/ui/simple-document'

export const metadata: Metadata = {
  title: '404 Not Found'
}

export default function NotFound(): JSX.Element {
  return (
    <SimpleDocument title="404 Not Found!" withBreadcrumbs>
      <p>お探しのページを見つけられませんでした。</p>
    </SimpleDocument>
  )
}
