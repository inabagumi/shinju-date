import Link from 'next/link'
import { joinURL } from 'ufo'

export default function NoResults({
  basePath = '/',
  message,
  title
}: {
  basePath?: string
  message: string
  title?: string
}) {
  return (
    <div className="space-y-8 px-8 py-16 text-center">
      {title && <h1 className="text-2xl font-bold">{title}</h1>}

      <p className="text-balance">{message}</p>

      <Link
        className="inline-block rounded-md border border-current px-6 py-3 font-semibold text-secondary-blue hover:bg-secondary-blue hover:text-secondary-blue-foreground dark:border-774-nevy-50 dark:text-774-nevy-50 dark:hover:bg-774-nevy-50 dark:hover:text-primary"
        href={joinURL(basePath, '/videos')}
        role="button"
      >
        新着動画を見る
      </Link>
    </div>
  )
}
