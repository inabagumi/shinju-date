'use client'

import { formatNumber } from '@shinju-date/helpers'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import {
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
} from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState, useTransition } from 'react'
import {
  getVideoBackfillRunAction,
  requestVideoBackfillRunAction,
  type VideoBackfillRun,
  type VideoBackfillRunAccount,
  type VideoBackfillTargets,
} from '../_actions/video-backfill-run'

type Status = VideoBackfillRunAccount['status']

/** How often progress is refreshed while a check is in progress. */
const POLL_INTERVAL_MS = 5_000

const PROVIDER_LABELS: Record<VideoBackfillRunAccount['provider'], string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

const STATUS_LABELS: Record<
  Status,
  { label: string; variant: 'info' | 'success' | 'warning' | 'error' }
> = {
  done: { label: '完了', variant: 'success' },
  failed: { label: '失敗', variant: 'error' },
  interrupted: { label: '中断', variant: 'warning' },
  pending: { label: '待機中', variant: 'info' },
  running: { label: '取り込み中', variant: 'info' },
}

/** Order of the counts in the summary. */
const STATUSES: Status[] = [
  'pending',
  'running',
  'done',
  'failed',
  'interrupted',
]

/** Accounts that need attention come first. */
const STATUS_ORDER: Record<Status, number> = {
  done: 4,
  failed: 2,
  interrupted: 3,
  pending: 1,
  running: 0,
}

function StatusBadge({ status }: { status: Status }) {
  const { label, variant } = STATUS_LABELS[status]

  return <Badge variant={variant}>{label}</Badge>
}

function AccountRow({ account }: { account: VideoBackfillRunAccount }) {
  return (
    <li className="px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            <span className="mr-2 text-xs text-gray-500">
              {PROVIDER_LABELS[account.provider]}
            </span>
            {account.talentName ? (
              <Link
                className="hover:underline"
                href={`/talents/${account.talentId}`}
              >
                {account.talentName}
              </Link>
            ) : (
              '削除されたタレント'
            )}
            {account.name && (
              <span className="ml-2 text-gray-500">{account.name}</span>
            )}
          </p>
          <p className="text-sm text-gray-500">
            {formatNumber(account.added)}件追加
            {account.updatedAt && (
              <>
                {' · '}
                <time dateTime={account.updatedAt}>
                  {formatDateTimeFromISO(account.updatedAt)}
                </time>
              </>
            )}
          </p>
          {account.error && (
            <p className="text-sm text-red-700">{account.error}</p>
          )}
        </div>
        <StatusBadge status={account.status} />
      </div>
    </li>
  )
}

function RunSummary({ run }: { run: VideoBackfillRun }) {
  const total = run.accounts.length
  const finished = total - run.counts.pending - run.counts.running
  const accounts = [...run.accounts].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  )

  return (
    <>
      <div className="space-y-3 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
          <p>
            <time dateTime={run.requestedAt}>
              {formatDateTimeFromISO(run.requestedAt)}
            </time>
            に依頼 · {formatNumber(total)}件
            {run.skipped > 0 && `（実行中のため除外: ${run.skipped}件）`}
            {run.failed > 0 && `（追加できなかった: ${run.failed}件）`}
          </p>
          {run.active ? (
            <Badge variant="info">実行中</Badge>
          ) : (
            <Badge variant="secondary">終了</Badge>
          )}
        </div>
        <div
          aria-label="取得漏れチェックの進捗"
          aria-valuemax={total}
          aria-valuemin={0}
          aria-valuenow={finished}
          className="h-2 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
        >
          <div
            className="h-full bg-774-blue-500 transition-all"
            style={{ width: `${total > 0 ? (finished / total) * 100 : 0}%` }}
          />
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {STATUSES.map((status) => (
            <div className="rounded-md bg-gray-50 p-2" key={status}>
              <dt className="text-xs text-gray-500">
                {STATUS_LABELS[status].label}
              </dt>
              <dd className="text-lg font-semibold text-gray-900">
                {formatNumber(run.counts[status])}
              </dd>
            </div>
          ))}
          <div className="rounded-md bg-gray-50 p-2">
            <dt className="text-xs text-gray-500">追加本数</dt>
            <dd className="text-lg font-semibold text-gray-900">
              {formatNumber(run.added)}
            </dd>
          </div>
        </dl>
      </div>
      <ul className="max-h-96 divide-y divide-gray-200 overflow-y-auto border-t border-gray-200">
        {accounts.map((account) => (
          <AccountRow
            account={account}
            key={`${account.provider}:${account.accountId}`}
          />
        ))}
      </ul>
    </>
  )
}

/**
 * 全 active タレントのアカウントについて、過去動画（プラットフォームにあって
 * DB にない動画）の取り込みをまとめてキューに追加し、その進捗を表示する。
 * 取り込みはバッチが非同期に行う。
 */
export function VideoBackfillRunPanel() {
  const [state, setState] = useState<{
    run: VideoBackfillRun | null
    targets: VideoBackfillTargets
  } | null>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  // Why the progress could not be loaded; shown with a retry button.
  const [loadError, setLoadError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    let result: Awaited<ReturnType<typeof getVideoBackfillRunAction>>

    try {
      result = await getVideoBackfillRunAction()
    } catch {
      result = { success: false }
    }

    if (!result.success || !result.targets) {
      setLoadError(
        result.error ?? '取得漏れチェックの状況を取得できませんでした。',
      )
      return
    }

    setLoadError(null)
    setState({ run: result.run ?? null, targets: result.targets })
  }, [])

  const isActive = state?.run?.active ?? false

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!isActive) {
      return
    }

    const timer = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [isActive, refresh])

  const request = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await requestVideoBackfillRunAction()

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

  const targets = state?.targets
  const totalTargets = targets ? targets.youtube + targets.twitch : 0

  return (
    <Card className="lg:col-span-2" variant="elevated">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg leading-6 font-medium text-gray-900">
              取得漏れチェック（全タレント）
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              active
              なタレントのすべてのアカウントについて、プラットフォーム上にあってデータベースにない過去の動画を取り込みます。登録済みの動画はそのまま残ります。
            </p>
          </div>
          <Dialog onOpenChange={setOpen} open={open}>
            <Button
              className="whitespace-nowrap"
              disabled={
                isPending || state === null || isActive || totalTargets === 0
              }
              onClick={() => setOpen(true)}
              size="sm"
              variant="secondary"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isActive ? '実行中' : '取得漏れをチェックする'}
            </Button>
            <DialogPortal>
              <DialogOverlay />
              <DialogContent>
                <DialogTitle>全タレントの取得漏れをチェック</DialogTitle>
                <DialogDescription>
                  active なタレントの YouTube チャンネル{' '}
                  {formatNumber(targets?.youtube ?? 0)}件と Twitch アカウント{' '}
                  {formatNumber(targets?.twitch ?? 0)}件（合計{' '}
                  {formatNumber(totalTargets)}
                  件）の過去動画をすべて確認し、未登録の動画を取り込みますか？
                  処理はバックグラウンドで順番に行われ、完了までに時間がかかります。
                </DialogDescription>
                <div className="flex justify-end gap-2">
                  <DialogClose asChild>
                    <Button disabled={isPending} variant="secondary">
                      キャンセル
                    </Button>
                  </DialogClose>
                  <Button
                    disabled={isPending}
                    onClick={request}
                    variant="primary"
                  >
                    {isPending ? '追加中...' : 'チェックする'}
                  </Button>
                </div>
              </DialogContent>
            </DialogPortal>
          </Dialog>
        </div>
        {state !== null && loadError && (
          <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {loadError}
          </div>
        )}
        {message && (
          <div
            className={`mt-3 rounded-md p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {state === null ? (
          loadError ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-sm text-red-700">
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
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              読み込み中...
            </div>
          )
        ) : state.run ? (
          <RunSummary run={state.run} />
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            最近の取得漏れチェックはありません。
          </div>
        )}
      </CardContent>
    </Card>
  )
}
