import type Database from '@shinju-date/database'
import { formatRelativeTime } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import { AuditLogTarget } from '../_components/audit-log-target'
import type { Log } from '../_lib/get-audit-logs'

const ACTION_LABELS: Record<
  Database['public']['Enums']['audit_action'],
  string
> = {
  CHANNEL_CREATE: 'チャンネルを作成',
  CHANNEL_DELETE: 'チャンネルを削除',
  CHANNEL_SYNC: 'チャンネルを同期',
  CHANNEL_UPDATE: 'チャンネルを更新',
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

export function LogItem({ log }: { log: Log }) {
  return (
    <li className="border-gray-200 border-b py-3 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <LogMessage log={log} />
          <AuditLogTarget log={log} />
        </div>
        <time className="ml-4 flex-shrink-0 text-right text-gray-500 text-xs">
          {formatRelativeTime(Temporal.Instant.from(log.created_at))}
        </time>
      </div>
    </li>
  )
}
