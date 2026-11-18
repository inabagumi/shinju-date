import type { Enums } from '@shinju-date/database'
import { formatRelativeTime } from '@shinju-date/temporal-fns'
import { AuditLogTarget } from '../_components/audit-log-target'
import { getChanges } from '../_lib/audit-log-details'
import type { Log } from '../_lib/get-audit-logs'

const ACTION_LABELS: Record<Enums<'audit_action'>, string> = {
  ACCOUNT_EMAIL_UPDATE: 'メールアドレスを更新',
  ACCOUNT_PASSWORD_UPDATE: 'パスワードを更新',
  ANNOUNCEMENT_CREATE: 'お知らせを作成',
  ANNOUNCEMENT_DELETE: 'お知らせを削除',
  ANNOUNCEMENT_UPDATE: 'お知らせを更新',
  // `CHANNEL_*` はタレントの操作（以前の名前。`talents` は、以前は `channels`）。
  // 過去のログが使っていて、Postgres では enum から値を削除できないので、名前は
  // そのまま使う
  CHANNEL_ACTIVATE: 'タレントをアクティブ状態に',
  CHANNEL_CREATE: 'タレントを作成',
  CHANNEL_DELETE: 'タレントを削除',
  CHANNEL_RESTORE: 'タレントを復元',
  CHANNEL_RETIRE: 'タレントを引退状態に',
  CHANNEL_SYNC: 'タレントを同期',
  CHANNEL_UPDATE: 'タレントを更新',
  FEATURE_REQUEST_UPDATE: 'フィードバックを更新',
  MAINTENANCE_MODE_DISABLE: 'メンテナンスモードを無効化',
  MAINTENANCE_MODE_ENABLE: 'メンテナンスモードを有効化',
  RECOMMENDED_QUERY_CREATE: 'おすすめクエリを作成',
  RECOMMENDED_QUERY_DELETE: 'おすすめクエリを削除',
  TERM_CREATE: '用語を作成',
  TERM_DELETE: '用語を削除',
  TERM_UPDATE: '用語を更新',
  TWITCH_USER_CREATE: 'Twitchアカウントを追加',
  TWITCH_USER_DELETE: 'Twitchアカウントを削除',
  VIDEO_BACKFILL: '過去動画の取り込みを依頼',
  VIDEO_DELETE: '動画を削除',
  VIDEO_RESTORE: '動画を復元',
  VIDEO_SYNC: '動画を同期',
  // 今は記録するコードがない。過去のログのために残す（Postgres では enum から値を
  // 削除できない）
  VIDEO_UPDATE: '動画を更新',
  VIDEO_VISIBILITY_TOGGLE: '動画の表示設定を変更',
  YOUTUBE_CHANNEL_CREATE: 'YouTubeチャンネルを追加',
  YOUTUBE_CHANNEL_DELETE: 'YouTubeチャンネルを削除',
}

function LogMessage({ log }: { log: Log }) {
  const actionLabel = ACTION_LABELS[log.action] ?? log.action

  return (
    <p className="text-meta">
      <span className="font-semibold">{log.user_email}</span>
      <span className="text-muted"> が{actionLabel}しました</span>
    </p>
  )
}

function ChangeDetails({ log }: { log: Log }) {
  const changes = getChanges(log.details)

  if (!changes) {
    return null
  }

  const { after, before } = changes

  const changedFields = Object.keys(before).filter(
    (key) => before[key] !== after[key],
  )

  if (changedFields.length === 0) {
    return null
  }

  return (
    <div className="mt-2 space-y-1 rounded-control bg-muted p-2 text-caption">
      {changedFields.map((field) => (
        <div className="flex gap-2" key={field}>
          <span className="font-semibold text-muted">{field}:</span>
          <span className="text-muted line-through">
            {String(before[field])}
          </span>
          <span aria-hidden="true" className="text-muted">
            →
          </span>
          <span>{String(after[field])}</span>
        </div>
      ))}
    </div>
  )
}

export function LogItem({ log }: { log: Log }) {
  return (
    <li className="border-b border-border py-3 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <LogMessage log={log} />
          <AuditLogTarget log={log} />
          <ChangeDetails log={log} />
        </div>
        <time
          className="ml-4 shrink-0 text-right text-caption text-muted tabular-nums"
          dateTime={log.created_at}
        >
          {formatRelativeTime(Temporal.Instant.from(log.created_at))}
        </time>
      </div>
    </li>
  )
}
