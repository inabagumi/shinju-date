'use client'

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '@shinju-date/ui'
import { useState, useTransition } from 'react'
import { deleteAnnouncementAction } from '../_actions'

type DeleteConfirmDialogProps = {
  announcementId: string
  announcementMessage: string
}

export function DeleteConfirmDialog({
  announcementId,
  announcementMessage,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteAnnouncementAction(announcementId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? '削除に失敗しました。')
      }
    })
  }

  // Truncate message for display
  const displayMessage =
    announcementMessage.length > 50
      ? `${announcementMessage.substring(0, 50)}...`
      : announcementMessage

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size="sm" variant="danger">
          削除
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>お知らせを削除</DialogTitle>
          <DialogDescription>
            本当に「{displayMessage}」を削除しますか？この操作は取り消せません。
          </DialogDescription>
          {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button disabled={isPending} variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              disabled={isPending}
              onClick={handleDelete}
              variant="primary"
            >
              {isPending ? '削除中...' : '削除'}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
