'use client'

import { useState, useTransition } from 'react'
import { twMerge } from 'tailwind-merge'
import { deleteChannelAction } from '../_actions'
import { syncChannelWithYouTube } from '../_actions/sync'

type Channel = {
  id: string
  name: string
}

type ChannelActionsProps = {
  channel: Channel
}

export function ChannelActions({ channel }: ChannelActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSync = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncChannelWithYouTube(channel.id)
        if (result.success) {
          setMessage({
            text: 'チャンネル情報を同期しました。',
            type: 'success',
          })
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

  const handleDelete = () => {
    if (
      !confirm(
        `チャンネル「${channel.name}」を削除しますか？この操作は元に戻せません。`,
      )
    ) {
      return
    }

    setMessage(null)
    startTransition(async () => {
      try {
        const result = await deleteChannelAction(channel.id)
        if (result.success) {
          setMessage({
            text: 'チャンネルを削除しました。',
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '削除に失敗しました。',
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
      <div className="flex gap-1">
        <button
          className="whitespace-nowrap rounded bg-blue-50 px-2 py-1 text-blue-600 text-xs hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          disabled={isPending}
          onClick={handleSync}
          type="button"
        >
          同期
        </button>
        <button
          className="whitespace-nowrap rounded bg-red-50 px-2 py-1 text-red-600 text-xs hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
          disabled={isPending}
          onClick={handleDelete}
          type="button"
        >
          削除
        </button>
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
