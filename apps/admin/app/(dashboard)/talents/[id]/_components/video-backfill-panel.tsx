'use client'

import { formatNumber } from '@shinju-date/helpers'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import { Button, Skeleton } from '@shinju-date/ui'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { AsyncPanelBody } from '@/components/async-panel-body'
import {
  BackfillAccountRow,
  BackfillAccountRowSkeleton,
} from '@/components/backfill-account-row'
import { BackfillStatusBadge } from '@/components/backfill-status-badge'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Panel, PanelSkeleton } from '@/components/panel'
import { PLATFORM_LABELS } from '@/components/platform-badge'
import { useBackfillRequest } from '@/lib/use-backfill-request'
import { usePolledResource } from '@/lib/use-polled-resource'
import {
  getVideoBackfillStatusAction,
  requestVideoBackfillAction,
} from '../../_actions/backfill'
import type { VideoBackfillStatus } from '../../_lib/get-video-backfill-status'

/** How often progress is refreshed while a job is queued or running. */
const POLL_INTERVAL_MS = 5_000

const TITLE = '過去動画の取り込み'
const DESCRIPTION =
  'プラットフォーム上にあってデータベースにない過去の動画を、すべての履歴をさかのぼって取り込みます。登録済みの動画はそのまま残ります。'

const PROVIDERS = ['youtube', 'twitch'] as const

interface VideoBackfillPanelProps {
  /** サーバーコンポーネントで取得した、アカウントごとの取り込み状況 */
  initialData: VideoBackfillStatus
  talentId: string
  talentName: string
}

/**
 * タレントの過去動画（プラットフォームにあって DB にない動画）の取り込みを
 * キューに追加し、その進捗を表示する。取り込みはバッチが非同期に行う。
 */
export function VideoBackfillPanel({
  initialData,
  talentId,
  talentName,
}: VideoBackfillPanelProps) {
  const router = useRouter()
  const { data, error, reload } = usePolledResource({
    fetcher: () => getVideoBackfillStatusAction(talentId),
    initialData,
    intervalMs: POLL_INTERVAL_MS,
    isActive: ({ accounts }) => accounts.some((account) => account.active),
  })
  const request = useBackfillRequest(requestVideoBackfillAction, reload)

  const { accounts } = data
  const added = accounts.reduce((total, account) => total + account.added, 0)
  const previousAdded = useRef(added)

  // Show the videos that were just added in the list below. Data that came
  // from the server was rendered together with that list, so it needs no
  // refresh (and asking for one would refresh again and again while a job
  // keeps adding videos).
  useEffect(() => {
    if (added > previousAdded.current && data !== initialData) {
      router.refresh()
    }

    previousAdded.current = added
  }, [added, data, initialData, router])

  if (accounts.length === 0) {
    return null
  }

  return (
    <Panel
      actions={PROVIDERS.map((provider) => {
        const label = PLATFORM_LABELS[provider]
        const targets = accounts.filter(
          (account) => account.provider === provider,
        )
        // While only some accounts are queued or being read, the others can
        // still be requested: the request skips the ones that are active.
        const isActive = targets.every((account) => account.active)

        if (targets.length === 0) {
          return null
        }

        return (
          <ConfirmDialog
            confirmLabel="取り込む"
            description={`「${talentName}」の${label}アカウント（${targets.length}件）の過去動画をすべて確認し、未登録の動画を取り込みますか？\n処理はバックグラウンドで順番に行われます。`}
            key={provider}
            onConfirm={() => request(talentId, provider)}
            pendingLabel="追加中..."
            title={TITLE}
            trigger={
              <Button
                className="whitespace-nowrap"
                disabled={isActive}
                variant="secondary"
              >
                {isActive ? `${label}: 実行中` : `${label}の過去動画を取り込む`}
              </Button>
            }
          >
            <ul className="space-y-1">
              {targets.map((account) => (
                <li key={account.accountId}>{account.name}</li>
              ))}
            </ul>
          </ConfirmDialog>
        )
      })}
      description={DESCRIPTION}
      title={TITLE}
    >
      <AsyncPanelBody error={error} onRetry={reload}>
        <ul className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
          {accounts.map((account) => (
            <BackfillAccountRow
              aside={<BackfillStatusBadge status={account.status} />}
              error={account.error}
              key={`${account.provider}:${account.accountId}`}
              name={account.name}
              provider={account.provider}
            >
              {account.status !== null && (
                <p className="text-meta text-muted tabular-nums">
                  {formatNumber(account.added)}件追加 ·{' '}
                  {formatNumber(account.pages)}
                  ページ確認
                  {account.updatedAt && (
                    <>
                      {' · '}
                      <time dateTime={account.updatedAt}>
                        {formatDateTimeFromISO(account.updatedAt)}
                      </time>
                    </>
                  )}
                </p>
              )}
            </BackfillAccountRow>
          ))}
        </ul>
      </AsyncPanelBody>
    </Panel>
  )
}

/** 読み込み中の `VideoBackfillPanel`。アカウント1件ぶんの行を置く */
export function VideoBackfillPanelSkeleton() {
  return (
    <PanelSkeleton
      actions={<Skeleton className="h-9 w-56" />}
      description={DESCRIPTION}
      title={TITLE}
    >
      <ul className="-mx-6 -mb-6 border-t border-border">
        <BackfillAccountRowSkeleton />
      </ul>
    </PanelSkeleton>
  )
}
