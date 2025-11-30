'use client'

import type { Tables } from '@shinju-date/database'
import { Button, Toast, ToastClose, ToastTitle } from '@shinju-date/ui'
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
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
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
    setToastMessage(null)

    try {
      if (action === 'toggle') {
        const result = await toggleVisibilityAction([videoId])
        if (result.success) {
          setToastMessage({
            text: `動画を${visible ? '非表示' : '表示'}に変更しました。`,
            type: 'success',
          })
          setToastOpen(true)
        } else {
          setToastMessage({
            text: result.error || '操作に失敗しました。',
            type: 'error',
          })
          setToastOpen(true)
        }
      } else if (action === 'delete') {
        const result = await softDeleteAction([videoId])
        if (result.success) {
          setToastMessage({
            text: '動画を削除しました。',
            type: 'success',
          })
          setToastOpen(true)
        } else {
          setToastMessage({
            text: result.error || '削除に失敗しました。',
            type: 'error',
          })
          setToastOpen(true)
        }
      } else if (action === 'restore') {
        const result = await restoreAction([videoId])
        if (result.success) {
          setToastMessage({
            text: '動画を復元しました。',
            type: 'success',
          })
          setToastOpen(true)
        } else {
          setToastMessage({
            text: result.error || '復元に失敗しました。',
            type: 'error',
          })
          setToastOpen(true)
        }
      }
    } catch (error) {
      setToastMessage({
        text:
          error instanceof Error
            ? error.message
            : '予期しないエラーが発生しました。',
        type: 'error',
      })
      setToastOpen(true)
    }
  }

  return (
    <>
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
