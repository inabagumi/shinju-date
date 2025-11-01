import Link from 'next/link'
import type { Log } from '../_lib/get-audit-logs'

const getAdminPagePath = (table: string, id: string): string | null => {
  switch (table) {
    case 'channels':
      return `/talents/${id}`
    case 'videos':
      return `/videos/${id}`
    case 'terms':
      return '/terms'
    default:
      return null
  }
}

export function AuditLogTarget({ log }: { log: Log }) {
  // detailsがオブジェクトであることを安全にチェック
  const detailsObject =
    log.details &&
    typeof log.details === 'object' &&
    !Array.isArray(log.details)
      ? (log.details as { entityName?: string })
      : null

  const displayName = detailsObject?.entityName ?? log.target_record_id

  if (!log.target_table || !displayName) {
    return null
  }

  const path = getAdminPagePath(log.target_table, log.target_record_id)

  const content = (
    <code className="rounded bg-gray-100 px-1.5 py-1 font-medium text-gray-800 text-xs">
      {displayName}
    </code>
  )

  if (path) {
    return (
      <div className="mt-1 pl-2">
        <span className="text-gray-500">{log.target_table}: </span>
        <Link className="hover:underline" href={path}>
          {content}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-1 pl-2">
      <span className="text-gray-500">{log.target_table}: </span>
      {content}
    </div>
  )
}
