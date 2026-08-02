'use client'

import type { Tables } from '@shinju-date/database'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { twMerge } from 'tailwind-merge'
import {
  activateTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../_actions'
import { syncTalentWithYouTube } from '../_actions/sync'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentActionsProps {
  talent: Talent
}

export function TalentActions({ talent }: TalentActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  const runAction = (
    confirmMessage: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successText: string,
  ) => {
    if (!confirm(confirmMessage)) {
      return
    }

    setMessage(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (result.success) {
          setMessage({ text: successText, type: 'success' })
          router.refresh()
        } else {
          setMessage({
            text: result.error || '操作に失敗しました。',
            type: 'error',
          })
        }
      } catch {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  const handleSync = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncTalentWithYouTube(talent.id)
        if (result.success) {
          setMessage({
            text: 'チャンネル情報を同期しました。',
            type: 'success',
          })
          router.refresh()
        } else {
          setMessage({
            text: result.error || '同期に失敗しました。',
            type: 'error',
          })
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
            className="whitespace-nowrap rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            disabled={isPending}
            onClick={() =>
              runAction(
                `タレント「${talent.name}」を復活しますか？`,
                () => restoreTalentAction(talent.id),
                'タレントを復活しました。',
              )
            }
            type="button"
          >
            復活
          </button>
        ) : (
          <>
            <button
              className="whitespace-nowrap rounded bg-774-blue-50 px-2 py-1 text-774-blue-600 text-xs hover:bg-774-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isPending}
              onClick={handleSync}
              type="button"
            >
              同期
            </button>
            {isActive && (
              <button
                className="whitespace-nowrap rounded bg-amber-50 px-2 py-1 text-amber-800 text-xs hover:bg-amber-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    `タレント「${talent.name}」を引退にしますか？`,
                    () => retireTalentAction(talent.id),
                    'タレントを引退にしました。',
                  )
                }
                type="button"
              >
                引退
              </button>
            )}
            {isRetired && (
              <button
                className="whitespace-nowrap rounded bg-green-50 px-2 py-1 text-green-700 text-xs hover:bg-green-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    `タレント「${talent.name}」をアクティブに戻しますか？`,
                    () => activateTalentAction(talent.id),
                    'タレントをアクティブに戻しました。',
                  )
                }
                type="button"
              >
                アクティブ
              </button>
            )}
            <button
              className="whitespace-nowrap rounded bg-red-50 px-2 py-1 text-red-600 text-xs hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
              disabled={isPending}
              onClick={() =>
                runAction(
                  `タレント「${talent.name}」を削除しますか？`,
                  () => deleteTalentAction(talent.id),
                  'タレントを削除しました。',
                )
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
            'rounded p-2 text-xs',
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
