'use client'

import { useState, useTransition } from 'react'
import {
  softDeleteSingleVideoAction,
  toggleSingleVideoVisibilityAction,
} from '../../_actions'

type Props = {
  videoSlug: string
  visible: boolean
  isDeleted: boolean
}

export function VideoActionsButtons({ videoSlug, visible, isDeleted }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleToggleVisibility = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await toggleSingleVideoVisibilityAction(videoSlug)
        if (result.success) {
          setMessage({
            text: `動画を${visible ? '非表示' : '表示'}に変更しました。`,
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '操作に失敗しました。',
            type: 'error',
          })
        }
      } catch (_error) {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  const handleDelete = () => {
    if (!confirm('この動画を削除しますか？この操作は元に戻せません。')) {
      return
    }

    setMessage(null)
    startTransition(async () => {
      try {
        const result = await softDeleteSingleVideoAction(videoSlug)
        if (result.success) {
          setMessage({
            text: '動画を削除しました。',
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '削除に失敗しました。',
            type: 'error',
          })
        }
      } catch (_error) {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  if (isDeleted) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          disabled={isPending}
          onClick={handleToggleVisibility}
          type="button"
        >
          {visible ? '非表示にする' : '表示する'}
        </button>
        <button
          className="inline-flex items-center rounded-md border border-red-300 bg-white px-3 py-2 font-medium text-red-700 text-sm shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          disabled={isPending}
          onClick={handleDelete}
          type="button"
        >
          削除
        </button>
      </div>

      {message && (
        <div
          className={`rounded-md p-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
