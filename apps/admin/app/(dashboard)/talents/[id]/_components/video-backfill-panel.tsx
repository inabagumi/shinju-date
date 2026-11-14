'use client'

import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import { Badge, Button, Card, CardContent, CardHeader } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  getVideoBackfillStatusAction,
  requestVideoBackfillAction,
  type VideoBackfillAccount,
} from '../../_actions/backfill'

type Provider = VideoBackfillAccount['provider']

/** How often progress is refreshed while a job is queued or running. */
const POLL_INTERVAL_MS = 5_000

const PROVIDER_LABELS: Record<Provider, string> = {
  twitch: 'Twitch',
  youtube: 'YouTube',
}

interface Props {
  talentId: string
  talentName: string
  hasYouTubeChannels: boolean
  hasTwitchUsers: boolean
}

function StatusBadge({ account }: { account: VideoBackfillAccount }) {
  if (account.status === null) {
    return <Badge variant="secondary">未実行</Badge>
  }

  if (
    !account.active &&
    (account.status === 'pending' || account.status === 'running')
  ) {
    return <Badge variant="warning">中断</Badge>
  }

  switch (account.status) {
    case 'pending':
      return <Badge variant="info">待機中</Badge>
    case 'running':
      return <Badge variant="info">取り込み中</Badge>
    case 'done':
      return <Badge variant="success">完了</Badge>
    case 'failed':
      return <Badge variant="error">失敗</Badge>
  }
}

function AccountRow({ account }: { account: VideoBackfillAccount }) {
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            <span className="mr-2 text-xs text-gray-500">
              {PROVIDER_LABELS[account.provider]}
            </span>
            {account.name}
          </p>
          {account.status !== null && (
            <p className="text-sm text-gray-500">
              {account.added}件追加 · {account.pages}ページ確認
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
          {account.error && (
            <p className="text-sm text-red-700">{account.error}</p>
          )}
        </div>
        <StatusBadge account={account} />
      </div>
    </li>
  )
}

/**
 * タレントの過去動画（プラットフォームにあって DB にない動画）の取り込みを
 * キューに追加し、その進捗を表示する。取り込みはバッチが非同期に行う。
 */
export function VideoBackfillPanel({
  talentId,
  talentName,
  hasYouTubeChannels,
  hasTwitchUsers,
}: Props) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<VideoBackfillAccount[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingProvider, setPendingProvider] = useState<Provider | null>(null)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  // Why the progress could not be loaded; shown with a retry button.
  const [loadError, setLoadError] = useState<string | null>(null)
  const previousAdded = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    let result: Awaited<ReturnType<typeof getVideoBackfillStatusAction>>

    try {
      result = await getVideoBackfillStatusAction(talentId)
    } catch {
      result = { success: false }
    }

    if (!result.success || !result.accounts) {
      setLoadError(result.error ?? '取り込み状況を取得できませんでした。')
      return
    }

    setLoadError(null)

    const added = result.accounts.reduce(
      (total, account) => total + account.added,
      0,
    )

    // Show the videos that were just added in the list below.
    if (previousAdded.current !== null && added > previousAdded.current) {
      router.refresh()
    }

    previousAdded.current = added
    setAccounts(result.accounts)
  }, [router, talentId])

  const hasActiveJobs = accounts?.some((account) => account.active) ?? false

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!hasActiveJobs) {
      return
    }

    const timer = setInterval(() => {
      void refresh()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(timer)
  }, [hasActiveJobs, refresh])

  const request = (provider: Provider) => {
    const label = PROVIDER_LABELS[provider]
    const count =
      accounts?.filter((account) => account.provider === provider).length ?? 0

    if (
      !window.confirm(
        `「${talentName}」の${label}アカウント${count > 0 ? `（${count}件）` : ''}の過去動画をすべて確認し、未登録の動画を取り込みますか？\n処理はバックグラウンドで順番に行われます。`,
      )
    ) {
      return
    }

    setMessage(null)
    setPendingProvider(provider)
    startTransition(async () => {
      try {
        const result = await requestVideoBackfillAction(talentId, provider)

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
        setPendingProvider(null)
      }
    })
  }

  /**
   * Whether every account of the platform is queued or being read. While only
   * some are, the others can still be requested: the request skips the ones
   * that are active.
   */
  const isProviderActive = (provider: Provider) => {
    const providerAccounts =
      accounts?.filter((account) => account.provider === provider) ?? []

    return (
      providerAccounts.length > 0 &&
      providerAccounts.every((account) => account.active)
    )
  }

  if (!hasYouTubeChannels && !hasTwitchUsers) {
    return null
  }

  return (
    <Card className="mt-6" variant="elevated">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              過去動画の取り込み
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              プラットフォーム上にあってデータベースにない過去の動画を、
              すべての履歴をさかのぼって取り込みます。登録済みの動画はそのまま残ります。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['youtube', 'twitch'] as const)
              .filter((provider) =>
                provider === 'youtube' ? hasYouTubeChannels : hasTwitchUsers,
              )
              .map((provider) => (
                <Button
                  className="whitespace-nowrap"
                  disabled={
                    isPending || accounts === null || isProviderActive(provider)
                  }
                  key={provider}
                  onClick={() => request(provider)}
                  size="sm"
                  variant="secondary"
                >
                  {pendingProvider === provider && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isProviderActive(provider)
                    ? `${PROVIDER_LABELS[provider]}: 実行中`
                    : `${PROVIDER_LABELS[provider]}の過去動画を取り込む`}
                </Button>
              ))}
          </div>
        </div>
        {accounts !== null && loadError && (
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
        {accounts === null ? (
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
        ) : (
          <ul className="divide-y divide-gray-200">
            {accounts.map((account) => (
              <AccountRow
                account={account}
                key={`${account.provider}:${account.accountId}`}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
