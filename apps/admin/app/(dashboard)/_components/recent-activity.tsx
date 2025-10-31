import { formatRelativeTime } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import getAuditLogs from '../_lib/get-audit-logs'

const ACTION_LABELS: Record<string, string> = {
  CHANNEL_CREATE: 'チャンネルを作成',
  CHANNEL_DELETE: 'チャンネルを削除',
  CHANNEL_UPDATE: 'チャンネルを更新',
  RECOMMENDED_QUERY_CREATE: 'おすすめクエリを作成',
  RECOMMENDED_QUERY_DELETE: 'おすすめクエリを削除',
  TERM_CREATE: '用語を作成',
  TERM_DELETE: '用語を削除',
  TERM_UPDATE: '用語を更新',
  VIDEO_DELETE: '動画を削除',
  VIDEO_VISIBILITY_TOGGLE: '動画の表示設定を変更',
}

export default async function RecentActivity() {
  const logs = await getAuditLogs(10)
  if (logs.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 font-semibold text-xl">最近のアクティビティ</h2>
        <p className="text-gray-500">最近のアクティビティはありません。</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 font-semibold text-xl">最近のアクティビティ</h2>
      <ul className="space-y-3">
        {logs.map((log) => (
          <li
            className="border-gray-200 border-b pb-3 last:border-b-0"
            key={log.id}
          >
            <div className="flex flex-col gap-1">
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {log.user_email}
                </span>
                <span className="text-gray-600">
                  {' '}
                  が{ACTION_LABELS[log.action] ?? log.action}しました
                </span>
                {log.target_id && (
                  <span className="text-gray-600">
                    : <code className="text-gray-700">{log.target_id}</code>
                  </span>
                )}
              </div>
              <time className="text-gray-500 text-xs">
                {formatRelativeTime(Temporal.Instant.from(log.created_at))}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
