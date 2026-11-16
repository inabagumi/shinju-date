'use client'

import { formatNumber } from '@shinju-date/helpers'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  EmptyState,
} from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getVideoBackfillHistoryAction,
  retryFailedVideoBackfillJobsAction,
  type VideoBackfillFailure,
  type VideoBackfillHistoryEntry,
} from '../_actions/video-backfill-history'

/**
 * How often the history is refreshed while failed accounts are retried, so
 * that their outcome shows up without reloading the page. The batch app
 * works the queue off once a minute.
 */
const POLL_INTERVAL_MS = 15_000

const PROVIDER_LABELS: Record<VideoBackfillHistoryEntry['provider'], string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

const STATUS_LABELS: Record<
  VideoBackfillHistoryEntry['status'],
  { label: string; variant: 'success' | 'danger' }
> = {
  done: { label: '完了', variant: 'success' },
  failed: { label: '失敗', variant: 'danger' },
}

const SCOPE_LABELS: Record<VideoBackfillHistoryEntry['scope'], string> = {
  all: '全タレントのチェックで依頼',
  single: '個別に依頼',
}

function TalentLink({
  talentId,
  talentName,
}: {
  talentId: string
  talentName: string | null
}) {
  return talentName ? (
    <Link className="text-accent hover:underline" href={`/talents/${talentId}`}>
      {talentName}
    </Link>
  ) : (
    '不明なタレント'
  )
}

function FailureRow({ failure }: { failure: VideoBackfillFailure }) {
  return (
    <li className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate text-meta font-semibold">
          <span className="mr-2 text-caption font-normal text-muted">
            {PROVIDER_LABELS[failure.provider]}
          </span>
          <TalentLink
            talentId={failure.talentId}
            talentName={failure.talentName}
          />
          <span className="ml-2 font-normal text-muted">{failure.name}</span>
        </p>
        {failure.active ? (
          <Badge variant="info">再試行中</Badge>
        ) : (
          <time
            className="text-caption text-muted tabular-nums"
            dateTime={failure.finishedAt}
          >
            {formatDateTimeFromISO(failure.finishedAt)}
          </time>
        )}
      </div>
      {failure.error && (
        <p className="text-meta text-danger">{failure.error}</p>
      )}
    </li>
  )
}

function HistoryRow({ entry }: { entry: VideoBackfillHistoryEntry }) {
  const { label, variant } = STATUS_LABELS[entry.status]

  return (
    <li className="px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-meta font-semibold">
            <span className="mr-2 text-caption font-normal text-muted">
              {PROVIDER_LABELS[entry.provider]}
            </span>
            <TalentLink
              talentId={entry.talentId}
              talentName={entry.talentName}
            />
            <span className="ml-2 font-normal text-muted">
              {entry.name ?? '削除されたアカウント'}
            </span>
          </p>
          <p className="text-meta text-muted tabular-nums">
            {formatNumber(entry.added)}件追加 · {formatNumber(entry.pages)}
            ページ · {entry.requester ?? '不明なユーザー'}が
            {SCOPE_LABELS[entry.scope]}
          </p>
          <p className="text-caption text-muted tabular-nums">
            <time dateTime={entry.requestedAt}>
              {formatDateTimeFromISO(entry.requestedAt)}
            </time>
            {' → '}
            <time dateTime={entry.finishedAt}>
              {formatDateTimeFromISO(entry.finishedAt)}
            </time>
          </p>
          {entry.error && (
            <p className="text-meta text-danger">{entry.error}</p>
          )}
        </div>
        <Badge variant={variant}>{label}</Badge>
      </div>
    </li>
  )
}

/**
 * 終了した過去動画の取り込み（バックフィル）の履歴を表示し、最後の取り込みが
 * 失敗したアカウントをまとめて再試行できるようにする。取り込みはバッチが非同期に行う。
 */
export function VideoBackfillHistoryPanel() {
  const [state, setState] = useState<{
    entries: VideoBackfillHistoryEntry[]
    failures: VideoBackfillFailure[]
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  // Why the history could not be loaded; shown with a retry button.
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    let result: Awaited<ReturnType<typeof getVideoBackfillHistoryAction>>

    try {
      result = await getVideoBackfillHistoryAction()
    } catch {
      result = { success: false }
    }

    if (!result.success || !result.entries || !result.failures) {
      setLoadError(
        result.error ?? '過去動画の取り込みの履歴を取得できませんでした。',
      )
      return
    }

    setLoadError(null)
    setState({ entries: result.entries, failures: result.failures })
  }, [])

  const isRetrying = state?.failures.some((failure) => failure.active) ?? false

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!isRetrying) {
      return
    }

    const timer = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [isRetrying, refresh])

  const retry = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await retryFailedVideoBackfillJobsAction()

        setMessage(
          result.success
            ? {
                text: result.message ?? 'キューに追加しました。',
                type: 'success',
              }
            : {
                text: result.error ?? 'キューへの追加に失敗しました。',
                type: 'error',
              },
        )
        await refresh()
      } catch {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      } finally {
        setOpen(false)
      }
    })
  }

  const failures = state?.failures ?? []
  const retryable = failures.filter((failure) => !failure.active).length

  return (
    <Card
      className="lg:col-span-2"
      id="video-backfill-history"
      variant="elevated"
    >
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-heading font-bold">過去動画の取り込みの履歴</h2>
            <p className="mt-1 max-w-text text-meta text-muted">
              終了した過去動画の取り込みの結果です。最後の取り込みが失敗したアカウントは、まとめて再試行できます。
            </p>
          </div>
          <Dialog onOpenChange={setOpen} open={open}>
            <Button
              className="whitespace-nowrap"
              disabled={isPending || retryable === 0}
              onClick={() => setOpen(true)}
              size="sm"
              variant="secondary"
            >
              {isPending && (
                <Loader2
                  aria-hidden="true"
                  className="mr-2 size-4 animate-spin"
                />
              )}
              失敗したジョブを再試行
            </Button>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent>
                <DialogTitle>失敗したジョブを再試行</DialogTitle>
                <DialogDescription>
                  最後の取り込みが失敗した {formatNumber(retryable)}
                  件のアカウントの過去動画の取り込みを、もう一度キューに追加しますか？
                  処理はバックグラウンドで順番に行われます。
                </DialogDescription>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button disabled={isPending} variant="secondary">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button
                    disabled={isPending}
                    onClick={retry}
                    variant="primary"
                  >
                    {isPending ? '追加中...' : '再試行する'}
                  </Button>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>
        </div>
        {state !== null && loadError && (
          <div
            className="mt-3 rounded-control bg-danger/10 p-3 text-meta text-danger"
            role="alert"
          >
            {loadError}
          </div>
        )}
        {message && (
          <div
            className={`mt-3 rounded-control p-3 text-meta ${
              message.type === 'success'
                ? 'bg-success/10 text-success'
                : 'bg-danger/10 text-danger'
            }`}
            role={message.type === 'success' ? 'status' : 'alert'}
          >
            {message.text}
          </div>
        )}
        {failures.length > 0 && (
          <Alert
            aria-label="最後の取り込みが失敗したアカウント"
            className="mt-3"
            role="region"
            title={
              <>
                最後の取り込みが失敗したアカウント:{' '}
                {formatNumber(failures.length)}件
                {failures.length > retryable &&
                  `（再試行中: ${formatNumber(failures.length - retryable)}件）`}
              </>
            }
            tone="danger"
          >
            <ul className="max-h-60 divide-y divide-danger/20 overflow-y-auto">
              {failures.map((failure) => (
                <FailureRow
                  failure={failure}
                  key={`${failure.provider}:${failure.accountId}`}
                />
              ))}
            </ul>
          </Alert>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {state === null ? (
          loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-meta text-danger">
              <p>{loadError}</p>
              <Button
                onClick={() => {
                  setLoadError(null)
                  void refresh()
                }}
                size="sm"
                variant="secondary"
              >
                再試行
              </Button>
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-meta text-muted">
              読み込み中...
            </div>
          )
        ) : state.entries.length > 0 ? (
          <ul className="mt-4 max-h-[32rem] divide-y divide-border overflow-y-auto border-t border-border">
            {state.entries.map((entry) => (
              <HistoryRow entry={entry} key={entry.id} />
            ))}
          </ul>
        ) : (
          <EmptyState title="終了した過去動画の取り込みはまだありません。" />
        )}
      </CardContent>
    </Card>
  )
}
