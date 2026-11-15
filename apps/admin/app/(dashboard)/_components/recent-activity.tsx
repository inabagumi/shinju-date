import { EmptyState } from '@shinju-date/ui'
import { cacheLife } from 'next/cache'
import { getAuditLogs } from '../_lib/get-audit-logs'
import { LogItem } from './log-item'

export async function RecentActivity() {
  'use cache: private'

  cacheLife('minutes')

  const logs = await getAuditLogs(10)

  return (
    <section className="rounded-container border border-border bg-surface p-6">
      <h2 className="mb-4 text-heading font-bold">最近のアクティビティ</h2>
      {logs.length === 0 ? (
        <EmptyState title="最近のアクティビティはありません" />
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </ul>
      )}
    </section>
  )
}
