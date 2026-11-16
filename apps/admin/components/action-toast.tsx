'use client'

import { Toast, ToastClose, ToastTitle } from '@shinju-date/ui'
import { useState } from 'react'

/** トーストの色。`Toast` のバリアントの名前と同じにし、そのまま渡す */
export type ActionToastType = 'success' | 'danger'

export interface ActionToastMessage {
  /** 同じ文言が続いても表示時間をやり直せるよう、表示のたびに変える */
  id: number
  text: string
  type: ActionToastType
}

interface ActionToastProps {
  message: ActionToastMessage | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 操作の結果を知らせるトースト。`useActionToast()` の `toastProps` を渡して使う。
 */
export function ActionToast({ message, onOpenChange, open }: ActionToastProps) {
  if (!message) {
    return null
  }

  return (
    <Toast
      duration={5000}
      key={message.id}
      onOpenChange={onOpenChange}
      open={open}
      variant={message.type}
    >
      <ToastTitle>{message.text}</ToastTitle>
      <ToastClose />
    </Toast>
  )
}

export function useActionToast() {
  const [message, setMessage] = useState<ActionToastMessage | null>(null)
  const [open, setOpen] = useState(false)

  const showToast = (type: ActionToastType, text: string) => {
    setMessage((prev) => ({ id: (prev?.id ?? 0) + 1, text, type }))
    setOpen(true)
  }

  return {
    showToast,
    toastProps: { message, onOpenChange: setOpen, open },
  }
}
