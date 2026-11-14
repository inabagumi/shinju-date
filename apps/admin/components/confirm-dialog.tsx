'use client'

import {
  Button,
  type ButtonProps,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@shinju-date/ui'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** 確認文。改行（`\n`）はそのまま表示する */
  description: string
  /** 操作の対象（チャンネル名など）を強調して示す内容 */
  children?: ReactNode
  confirmLabel: string
  confirmVariant?: ButtonProps['variant']
  /** 確認ボタンが押されたときに、ダイアログを閉じてから呼ばれる */
  onConfirm: () => void
}

/**
 * ブラウザ標準の `confirm()` の代わりに使う確認ダイアログ。
 * キャンセルした場合は `onConfirm` を呼ばずに閉じる。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onOpenChange(false)
    onConfirm()
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription
            className={`whitespace-pre-line ${children ? 'mb-4' : ''}`}
          >
            {description}
          </DialogDescription>
          {children && (
            <div className="mb-6 rounded-md border border-border bg-muted p-3 text-sm">
              {children}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              onClick={handleConfirm}
              type="button"
              variant={confirmVariant}
            >
              {confirmLabel}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
