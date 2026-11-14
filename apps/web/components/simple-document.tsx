import type { ReactNode } from 'react'
import Breadcrumbs from './breadcrumbs'
import { MAIN_CONTENT_ID } from './skip-link'

export default function SimpleDocument({
  button,
  children,
  title,
  withBreadcrumbs = false,
}: {
  button?: ReactNode
  children: ReactNode
  title?: ReactNode
  withBreadcrumbs?: boolean
}) {
  return (
    // スキップリンクで移動したときに見出しを飛ばさないよう、見出しも `<main>` に含める
    <main className="scroll-mt-20" id={MAIN_CONTENT_ID}>
      {title && (
        <div className="bg-primary text-primary-foreground dark:bg-zinc-800">
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-16">
            <h1 className="text-3xl font-bold">{title}</h1>

            {button}
          </div>
        </div>
      )}

      <div className="spacer-y-4 mx-auto max-w-6xl">
        {withBreadcrumbs && <Breadcrumbs title={title} />}

        <div className="p-8">{children}</div>
      </div>
    </main>
  )
}
