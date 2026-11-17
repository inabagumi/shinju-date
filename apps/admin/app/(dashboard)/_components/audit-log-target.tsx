import Link from 'next/link'
import { AUDIT_TARGET_TABLES } from '@/lib/audit-log'
import { getEntityName } from '../_lib/audit-log-details'
import type { Log } from '../_lib/get-audit-logs'

const getAdminPagePath = (table: string, id: string): string | null => {
  switch (table) {
    case AUDIT_TARGET_TABLES.CHANNELS:
      return `/talents/${id}`
    case AUDIT_TARGET_TABLES.VIDEOS:
      return `/videos/${id}`
    case AUDIT_TARGET_TABLES.TERMS:
      return '/terms'
    default:
      return null
  }
}

export function AuditLogTarget({ log }: { log: Log }) {
  const displayName = getEntityName(log.details) ?? log.target_record_id

  if (!log.target_table || !displayName) {
    return null
  }

  const path = getAdminPagePath(log.target_table, log.target_record_id)

  const content = (
    <code className="rounded-control bg-muted px-1.5 py-0.5 text-caption font-semibold">
      {displayName}
    </code>
  )

  if (path) {
    return (
      <div className="mt-1 pl-2 text-meta">
        <span className="text-muted">{log.target_table}: </span>
        <Link className="text-accent hover:underline" href={path}>
          {content}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-1 pl-2 text-meta">
      <span className="text-muted">{log.target_table}: </span>
      {content}
    </div>
  )
}
