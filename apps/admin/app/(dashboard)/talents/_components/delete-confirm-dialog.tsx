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
import { deleteTalentAction } from '../_actions'

type DeleteConfirmDialogProps = {
  talentId: string
  talentName: string
}

export function DeleteConfirmDialog({
  talentId,
  talentName,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTalentAction(talentId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? '削除に失敗しました。')
      }
    })
  }

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
          <DialogTitle>タレントを削除</DialogTitle>
          <DialogDescription>
            本当に「{talentName}」を削除しますか？この操作は取り消せません。
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
