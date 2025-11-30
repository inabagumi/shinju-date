'use client'

import { Button, Toast, ToastClose, ToastTitle } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { syncVideoWithYouTube } from '../../_actions/sync'

interface Props {
  videoId: string
}

export function SyncVideoButton({ videoId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const handleSync = () => {
    setToastMessage(null)
    startTransition(async () => {
      try {
        const result = await syncVideoWithYouTube(videoId)
        if (result.success) {
          setToastMessage({ text: '動画情報を同期しました。', type: 'success' })
          setToastOpen(true)
        } else {
          setToastMessage({
            text: result.error || '同期に失敗しました。',
            type: 'error',
          })
          setToastOpen(true)
        }
      } catch (_error) {
        setToastMessage({
          text: '予期しないエラーが発生しました。',
          type: 'error',
        })
        setToastOpen(true)
      }
    })
  }

  return (
    <>
      <Button disabled={isPending} onClick={handleSync} variant="primary">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? '同期中...' : 'YouTubeと同期'}
      </Button>

      {toastMessage && (
        <Toast
          duration={5000}
          onOpenChange={setToastOpen}
          open={toastOpen}
          variant={
            toastMessage.type === 'success'
              ? 'success'
              : toastMessage.type === 'error'
                ? 'destructive'
                : 'default'
          }
        >
          <ToastTitle>{toastMessage.text}</ToastTitle>
          <ToastClose />
        </Toast>
      )}
    </>
  )
}
