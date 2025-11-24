'use client'

import { Button } from '@shinju-date/ui'
import { useState, useTransition } from 'react'
import {
  restoreSingleVideoAction,
  softDeleteSingleVideoAction,
  toggleSingleVideoVisibilityAction,
} from '../../_actions'

interface Props {
  videoId: string
  visible: boolean
  isDeleted: boolean
}

export function VideoActionsButtons({ videoId, visible, isDeleted }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleToggleVisibility = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await toggleSingleVideoVisibilityAction(videoId)
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
        const result = await softDeleteSingleVideoAction(videoId)
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

  const handleRestore = () => {
    if (!confirm('この動画を復元しますか？')) {
      return
    }

    setMessage(null)
    startTransition(async () => {
      try {
        const result = await restoreSingleVideoAction(videoId)
        if (result.success) {
          setMessage({
            text: '動画を復元しました。',
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '復元に失敗しました。',
            type: 'error',
          })
        }
      } catch (_error) {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        {isDeleted ? (
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            disabled={isPending}
            onClick={handleRestore}
            variant="secondary"
          >
            復元
          </Button>
        ) : (
          <>
            <Button
              disabled={isPending}
              onClick={handleToggleVisibility}
              variant="secondary"
            >
              {visible ? '非表示にする' : '表示する'}
            </Button>
            <Button
              className="border-red-300 text-red-700 hover:bg-red-50"
              disabled={isPending}
              onClick={handleDelete}
              variant="secondary"
            >
              削除
            </Button>
          </>
        )}
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
