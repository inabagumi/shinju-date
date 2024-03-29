import { type ReactNode } from 'react'
import Breadcrumbs from './breadcrumbs'

export default function SimpleDocument({
  button,
  children,
  title,
  withBreadcrumbs = false
}: {
  button?: ReactNode
  children: ReactNode
  title?: ReactNode
  withBreadcrumbs?: boolean
}) {
  return (
    <>
      {title && (
        <div className="bg-primary text-primary-foreground dark:bg-zinc-800">
          <div className="mx-auto max-w-6xl space-y-8 py-16 px-4">
            <h1 className="text-3xl font-bold">{title}</h1>

            {button}
          </div>
        </div>
      )}

      <main className="spacer-y-4 mx-auto max-w-6xl">
        {withBreadcrumbs && <Breadcrumbs title={title} />}

        <div className="p-8">{children}</div>
      </main>
    </>
  )
}
