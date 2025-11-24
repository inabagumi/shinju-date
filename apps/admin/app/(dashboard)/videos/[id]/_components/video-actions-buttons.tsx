'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { useState, useTransition } from 'react'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../../_actions'
import { VideoActionConfirmDialog } from '../../_components/video-action-confirm-dialog'

type VideoInfo = Pick<Tables<'videos'>, 'id' | 'title'>

interface Props {
  videoId: string
  videoTitle: string
  visible: boolean
  isDeleted: boolean
}

export function VideoActionsButtons({
  videoId,
  videoTitle,
  visible,
  isDeleted,
}: Props) {
  const [isPending, _startTransition] = useTransition()
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'toggle' | 'delete' | 'restore'
    open: boolean
  }>({ action: 'toggle', open: false })

  const videoInfo: VideoInfo = { id: videoId, title: videoTitle }

  const handleToggleVisibility = () => {
    setConfirmDialog({ action: 'toggle', open: true })
  }

  const handleDelete = () => {
    setConfirmDialog({ action: 'delete', open: true })
  }

  const handleRestore = () => {
    setConfirmDialog({ action: 'restore', open: true })
  }

  const handleConfirm = async () => {
    const { action } = confirmDialog
    setMessage(null)

    if (action === 'toggle') {
      const result = await toggleVisibilityAction([videoId])
      if (result.success) {
        setMessage({
          text: `動画を${visible ? '非表示' : '表示'}に変更しました。`,
          type: 'success',
        })
      } else {
        throw new Error(result.error || '操作に失敗しました。')
      }
    } else if (action === 'delete') {
      const result = await softDeleteAction([videoId])
      if (result.success) {
        setMessage({
          text: '動画を削除しました。',
          type: 'success',
        })
      } else {
        throw new Error(result.error || '削除に失敗しました。')
      }
    } else if (action === 'restore') {
      const result = await restoreAction([videoId])
      if (result.success) {
        setMessage({
          text: '動画を復元しました。',
          type: 'success',
        })
      } else {
        throw new Error(result.error || '復元に失敗しました。')
      }
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          {isDeleted ? (
            <Button
              disabled={isPending}
              onClick={handleRestore}
              variant="primary"
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
                disabled={isPending}
                onClick={handleDelete}
                variant="danger"
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

      <VideoActionConfirmDialog
        action={confirmDialog.action}
        onConfirm={handleConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        videos={[videoInfo]}
      />
    </>
  )
}
