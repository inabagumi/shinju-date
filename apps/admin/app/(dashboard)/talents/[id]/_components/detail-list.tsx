import type { ReactNode } from 'react'

interface DetailListProps {
  children: ReactNode
}

/** 項目名と値の一覧。パネルの中で、行を `border` の線で区切る */
export function DetailList({ children }: DetailListProps) {
  return (
    <dl className="divide-y divide-border border-t border-border">
      {children}
    </dl>
  )
}

interface DetailRowProps {
  children: ReactNode
  label: ReactNode
}

export function DetailRow({ children, label }: DetailRowProps) {
  return (
    <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-meta font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-meta text-foreground sm:col-span-2 sm:mt-0">
        {children}
      </dd>
    </div>
  )
}

interface PanelHeadingProps {
  actions?: ReactNode
  description?: ReactNode
  title: ReactNode
}

/** 詳細ページのパネルの見出し。説明と操作ボタン（任意）を並べる */
export function PanelHeading({
  actions,
  description,
  title,
}: PanelHeadingProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h2 className="text-heading font-bold">{title}</h2>
        {description && <p className="text-meta text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
