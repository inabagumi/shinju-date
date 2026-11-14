import type { ReactNode } from 'react'
import PageHeader from './page-header'
import { MAIN_CONTENT_ID } from './skip-link'

interface SimpleDocumentProps {
  children: ReactNode
  title: string
}

/**
 * 文章を読むためのページ（とは・利用規約・プライバシーポリシー・404）。
 * 本文は 1行40〜45文字程度に収まるよう `max-w-text` に置く。
 */
export default function SimpleDocument({
  children,
  title,
}: SimpleDocumentProps) {
  return (
    <main
      className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8"
      id={MAIN_CONTENT_ID}
    >
      <PageHeader breadcrumbs={[{ name: title }]} title={title} />

      <div className="max-w-text text-body text-foreground">{children}</div>
    </main>
  )
}
