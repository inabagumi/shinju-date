import type { ReactNode } from 'react'
import Breadcrumbs, { type BreadcrumbItem } from './breadcrumbs'

interface PageHeaderProps {
  /** トップページより下の階層。最後の項目が現在のページになる */
  breadcrumbs: BreadcrumbItem[]
  /** 見出しの下に表示する説明文 */
  description?: ReactNode
  title: ReactNode
}

/**
 * トップページを除く全ページで使うページ見出し。
 * パンくず・見出し・説明文を左寄せで並べ、下に 32px の余白を取る。
 */
export default function PageHeader({
  breadcrumbs,
  description,
  title,
}: PageHeaderProps) {
  return (
    <header className="mb-8 space-y-2">
      <Breadcrumbs items={breadcrumbs} />

      <h1 className="text-title font-bold text-foreground md:text-display">
        {title}
      </h1>

      {description && (
        <div className="max-w-text space-y-2 text-body text-muted">
          {description}
        </div>
      )}
    </header>
  )
}

export function PageHeaderSkeleton() {
  return (
    <div aria-hidden="true" className="mb-8 space-y-2">
      <div className="h-[1.4rem] w-48 animate-pulse rounded-control bg-muted" />
      <div className="h-[2.1rem] w-64 animate-pulse rounded-control bg-muted md:h-[2.8rem]" />
    </div>
  )
}
