'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useTransition } from 'react'
import { deleteTermAction } from '../_actions'

type DeleteConfirmDialogProps = {
  termId: string
  termName: string
}

export function DeleteConfirmDialog({
  termId,
  termName,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTermAction(termId)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error ?? '削除に失敗しました。')
      }
    })
  }

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button
          className="rounded-md border border-red-600 px-3 py-1 text-red-600 text-sm hover:bg-red-50"
          type="button"
        >
          削除
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <Dialog.Content className="-translate-x-1/2 -translate-y-1/2 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[450px] rounded-lg bg-white p-6 shadow-lg data-[state=closed]:animate-out data-[state=open]:animate-in">
          <Dialog.Title className="mb-4 font-semibold text-xl">
            用語を削除
          </Dialog.Title>
          <Dialog.Description className="mb-6 text-gray-600">
            本当に「{termName}」を削除しますか？この操作は取り消せません。
          </Dialog.Description>
          {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild>
              <button
                className="rounded-md border border-774-blue-300 px-4 py-2 hover:bg-gray-50"
                disabled={isPending}
                type="button"
              >
                キャンセル
              </button>
            </Dialog.Close>
            <button
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              disabled={isPending}
              onClick={handleDelete}
              type="button"
            >
              {isPending ? '削除中...' : '削除'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
