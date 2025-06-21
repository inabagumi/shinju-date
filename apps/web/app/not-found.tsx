import type { Metadata } from 'next'
import SimpleDocument from '@/components/simple-document'

export const metadata: Metadata = {
  title: '404 Not Found',
}

export default function NotFound() {
  return (
    <SimpleDocument title="404 Not Found!" withBreadcrumbs>
      <p>お探しのページを見つけられませんでした。</p>
    </SimpleDocument>
  )
}
