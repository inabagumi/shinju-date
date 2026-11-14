import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Buttons shown at the end of the heading, such as an "add" button */
  actions?: ReactNode
  description?: ReactNode
  title: ReactNode
}

/**
 * The heading of a page in the dashboard. Every page uses this so the size,
 * weight and spacing of headings stay the same across the admin UI.
 */
export function PageHeader({ actions, description, title }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-title font-bold md:text-display">{title}</h1>
        {description && <p className="text-meta text-muted">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
