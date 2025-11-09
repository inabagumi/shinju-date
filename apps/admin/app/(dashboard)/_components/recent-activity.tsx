import { cacheLife } from 'next/cache'
import { getAuditLogs } from '../_lib/get-audit-logs'
import { LogItem } from './log-item'

export async function RecentActivity() {
  'use cache: private'
  cacheLife('minutes')

  const logs = await getAuditLogs(10)

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 font-semibold text-xl">最近のアクティビティ</h2>
      {logs.length === 0 ? (
        <p className="text-gray-500">最近のアクティビティはありません。</p>
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </ul>
      )}
    </div>
  )
}
