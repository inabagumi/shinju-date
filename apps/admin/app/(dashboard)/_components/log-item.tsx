import type Database from '@shinju-date/database'
import { formatRelativeTime } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { AuditLogTarget } from '../_components/audit-log-target'
import type { Log } from '../_lib/get-audit-logs'

const ACTION_LABELS: Record<
  Database['public']['Enums']['audit_action'],
  string
> = {
  ACCOUNT_EMAIL_UPDATE: 'メールアドレスを更新',
  ACCOUNT_PASSWORD_UPDATE: 'パスワードを更新',
  CHANNEL_CREATE: 'タレントを作成',
  CHANNEL_DELETE: 'タレントを削除',
  CHANNEL_SYNC: 'タレントを同期',
  CHANNEL_UPDATE: 'タレントを更新',
  MAINTENANCE_MODE_DISABLE: 'メンテナンスモードを無効化',
  MAINTENANCE_MODE_ENABLE: 'メンテナンスモードを有効化',
  RECOMMENDED_QUERY_CREATE: 'おすすめクエリを作成',
  RECOMMENDED_QUERY_DELETE: 'おすすめクエリを削除',
  TERM_CREATE: '用語を作成',
  TERM_DELETE: '用語を削除',
  TERM_UPDATE: '用語を更新',
  VIDEO_DELETE: '動画を削除',
  VIDEO_SYNC: '動画を同期',
  VIDEO_UPDATE: '動画を更新',
  VIDEO_VISIBILITY_TOGGLE: '動画の表示設定を変更',
}

function LogMessage({ log }: { log: Log }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action

  return (
    <p className="text-sm">
      <span className="font-medium text-gray-900">{log.user_email}</span>
      <span className="text-gray-600"> が{actionLabel}しました</span>
    </p>
  )
}

function ChangeDetails({ log }: { log: Log }) {
  // Check if details has changes object
  const detailsObject =
    log.details &&
    typeof log.details === 'object' &&
    !Array.isArray(log.details)
      ? (log.details as { changes?: { before?: unknown; after?: unknown } })
      : null

  const changes = detailsObject?.changes

  if (!changes || !changes.before || !changes.after) {
    return null
  }

  // Extract changed fields
  const beforeObj =
    typeof changes.before === 'object' && changes.before !== null
      ? (changes.before as Record<string, unknown>)
      : {}
  const afterObj =
    typeof changes.after === 'object' && changes.after !== null
      ? (changes.after as Record<string, unknown>)
      : {}

  const changedFields = Object.keys(beforeObj).filter(
    (key) => beforeObj[key] !== afterObj[key],
  )

  if (changedFields.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-1 rounded-md bg-gray-50 p-2 text-xs">
      {changedFields.map((field) => (
        <div className="flex gap-2" key={field}>
          <span className="font-medium text-gray-600">{field}:</span>
          <span className="text-gray-500 line-through">
            {String(beforeObj[field])}
          </span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-900">{String(afterObj[field])}</span>
        </div>
      ))}
    </div>
  )
}

export function LogItem({ log }: { log: Log }) {
  return (
    <li className="border-gray-200 border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <LogMessage log={log} />
          <AuditLogTarget log={log} />
          <ChangeDetails log={log} />
        </div>
        <time
          className="ml-4 flex-shrink-0 text-right text-gray-500 text-xs"
          dateTime={log.created_at}
        >
          {formatRelativeTime(Temporal.Instant.from(log.created_at))}
        </time>
      </div>
    </li>
  )
}
