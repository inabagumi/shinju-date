import { Button } from '@shinju-date/ui'
import type { Metadata } from 'next'
import Link from 'next/link'
import SimpleDocument from '@/components/simple-document'
import { OpenSearchModalButton } from './_components/open-search-modal-button'

const title = 'ページが見つかりません'

export const metadata: Metadata = {
  title,
}

export default function NotFound() {
  return (
    <SimpleDocument title={title} withBreadcrumbs>
      <div className="max-w-text space-y-8">
        <p className="text-body">お探しのページを見つけられませんでした。</p>

        <ul className="flex flex-wrap gap-4">
          <li>
            <Button asChild size="lg">
              <Link href="/">トップページへ</Link>
            </Button>
          </li>
          <li>
            <Button asChild size="lg" variant="secondary">
              <Link href="/videos">動画一覧を見る</Link>
            </Button>
          </li>
          <li>
            <OpenSearchModalButton size="lg" variant="secondary" />
          </li>
        </ul>
      </div>
    </SimpleDocument>
  )
}
