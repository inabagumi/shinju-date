'use client'

import { useState, useTransition } from 'react'
import { SpinnerIcon } from '@/components/icons'
import { syncVideoWithYouTube } from '../../_actions/sync'

type Props = {
  videoSlug: string
}

export function SyncVideoButton({ videoSlug }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSync = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncVideoWithYouTube(videoSlug)
        if (result.success) {
          setMessage({ text: '動画情報を同期しました。', type: 'success' })
        } else {
          setMessage({
            text: result.error || '同期に失敗しました。',
            type: 'error',
          })
        }
      } catch (_error) {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'error' })
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 font-medium text-sm text-white shadow-sm hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        disabled={isPending}
        onClick={handleSync}
        type="button"
      >
        {isPending && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? '同期中...' : 'YouTubeと同期'}
      </button>

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
