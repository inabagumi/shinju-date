'use client'

import { Button } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { syncTalentWithYouTube } from '../../_actions/sync'

interface Props {
  talentId: string
}

export function SyncTalentButton({ talentId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSync = () => {
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await syncTalentWithYouTube(talentId)
        if (result.success) {
          setMessage({
            text: 'タレント情報を同期しました。',
            type: 'success',
          })
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
      <Button
        className="whitespace-nowrap"
        disabled={isPending}
        onClick={handleSync}
        variant="primary"
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? '同期中...' : 'YouTubeと同期'}
      </Button>

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
