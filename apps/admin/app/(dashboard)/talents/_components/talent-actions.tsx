'use client'

import type { Tables } from '@shinju-date/database'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  activateTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../_actions'
import { syncTalentAccounts } from '../_actions/sync'
import { useTalentLifecycleAction } from '../_lib/use-talent-lifecycle-action'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentActionsProps {
  talent: Talent
}

export function TalentActions({ talent }: TalentActionsProps) {
  const router = useRouter()
  const {
    isPending: isLifecyclePending,
    message,
    run,
    setMessage,
  } = useTalentLifecycleAction()
  const [isSyncPending, startSyncTransition] = useTransition()
  const isPending = isLifecyclePending || isSyncPending

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  const handleSync = () => {
    setMessage(null)
    startSyncTransition(async () => {
      try {
        const result = await syncTalentAccounts(talent.id)
        if (result.success) {
          setMessage({
            text:
              result.message ??
              (result.unchanged
                ? 'アカウント情報は既に最新です。'
                : 'アカウント情報を同期しました。'),
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '同期に失敗しました。',
            type: 'error',
          })
        }
        // A platform may have been updated even when another one failed.
        if (result.unchanged === false) {
          router.refresh()
        }
      } catch {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-end gap-1">
        {isDeleted ? (
          <button
            className="rounded bg-green-50 px-2 py-1 text-xs whitespace-nowrap text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            disabled={isPending}
            onClick={() =>
              run(() => restoreTalentAction(talent.id), {
                confirmMessage: `タレント「${talent.name}」を復活しますか？`,
                successText: 'タレントを復活しました。',
              })
            }
            type="button"
          >
            復活
          </button>
        ) : (
          <>
            <button
              className="rounded bg-774-blue-50 px-2 py-1 text-xs whitespace-nowrap text-774-blue-600 hover:bg-774-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isPending}
              onClick={handleSync}
              type="button"
            >
              同期
            </button>
            {isActive && (
              <button
                className="rounded bg-amber-50 px-2 py-1 text-xs whitespace-nowrap text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                disabled={isPending}
                onClick={() =>
                  run(() => retireTalentAction(talent.id), {
                    confirmMessage: `タレント「${talent.name}」を引退にしますか？`,
                    successText: 'タレントを引退にしました。',
                  })
                }
                type="button"
              >
                引退
              </button>
            )}
            {isRetired && (
              <button
                className="rounded bg-green-50 px-2 py-1 text-xs whitespace-nowrap text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                disabled={isPending}
                onClick={() =>
                  run(() => activateTalentAction(talent.id), {
                    confirmMessage: `タレント「${talent.name}」をアクティブに戻しますか？`,
                    successText: 'タレントをアクティブに戻しました。',
                  })
                }
                type="button"
              >
                アクティブ
              </button>
            )}
            <button
              className="rounded bg-red-50 px-2 py-1 text-xs whitespace-nowrap text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isPending}
              onClick={() =>
                run(() => deleteTalentAction(talent.id), {
                  confirmMessage: `タレント「${talent.name}」を削除しますか？`,
                  successText: 'タレントを削除しました。',
                })
              }
              type="button"
            >
              削除
            </button>
          </>
        )}
      </div>

      {message && (
        <div
          className={twMerge(
            'rounded p-2 text-xs whitespace-pre-line',
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800',
          )}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
