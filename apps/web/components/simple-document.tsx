import type { ReactNode } from 'react'
import PageHeader from './page-header'
import PageMain from './page-main'

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
    <PageMain>
      <PageHeader breadcrumbs={[{ name: title }]} title={title} />

      <div className="max-w-text text-body text-foreground">{children}</div>
    </PageMain>
  )
}
