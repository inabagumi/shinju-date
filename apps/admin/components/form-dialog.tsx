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
  twMerge,
} from '@shinju-date/ui'
import { unstable_rethrow } from 'next/navigation'
import { type ReactElement, type ReactNode, useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'
import type { FormState } from '@/components/form'
import Form, { SubmitButton } from '@/components/form'
import { SERVER_ACTION_FALLBACK_ERROR } from '@/lib/use-server-action'

/** ダイアログの幅 */
export type FormDialogSize = 'md' | 'lg'

const SIZE_CLASS_NAMES = {
  lg: 'max-w-lg',
  md: undefined,
} as const satisfies Record<FormDialogSize, string | undefined>

export interface FormDialogProps {
  /** 開くためのボタン。開閉の状態は部品の中で持つ */
  trigger: ReactElement
  title: string
  description?: ReactNode | undefined
  /**
   * フォームを送信したときに呼ぶアクション。`{ success: true }` を返したとき
   * だけダイアログを閉じる。検証のエラー（`errors`）や、項目に結び付かない
   * エラー（`error`）を返したときは、ダイアログの中に表示して開いたままにする。
   * 例外が投げられたときは「処理に失敗しました。」を表示し、入力を残したまま
   * 送信し直せるようにする
   */
  action: (
    currentState: FormState,
    formData: FormData,
  ) => FormState | Promise<FormState>
  /** 保存のボタンの文字 */
  submitLabel: string
  /**
   * ダイアログの幅。`md`（既定）は 450px、`lg` は入力欄が多いときに使う。
   * 高さが画面に収まらない場合は、ダイアログの中でスクロールする
   */
  size?: FormDialogSize | undefined
  /** 入力欄。`FormField` を並べる */
  children: ReactNode
  /** アクションが成功して、ダイアログを閉じるときに呼ばれる */
  onSuccess?: (() => void) | undefined
}

interface FormDialogFooterProps {
  submitLabel: string
}

function FormDialogFooter({ submitLabel }: FormDialogFooterProps) {
  const { pending } = useFormStatus()

  return (
    <div className="flex justify-end gap-2 pt-2">
      <DialogClose asChild>
        <Button disabled={pending} type="button" variant="secondary">
          キャンセル
        </Button>
      </DialogClose>
      <SubmitButton>{submitLabel}</SubmitButton>
    </div>
  )
}

/**
 * 作成と編集に使う、フォームを載せたダイアログ。
 * 開くボタン、見出し、取り消しと保存のボタンを持ち、入力欄だけを `children` で
 * 受け取る。
 */
export function FormDialog({
  trigger,
  title,
  description,
  action,
  submitLabel,
  size = 'md',
  children,
  onSuccess,
}: FormDialogProps) {
  const [open, setOpen] = useState(false)
  // 開くたびにフォームを作り直して、前回の入力とエラーを消す。閉じるアニメー
  // ションの途中で開き直しても消えるよう、`key` で作り直す
  const [formKey, setFormKey] = useState(0)
  // 送信中かどうか。アクションの中の状態の更新は、アクションが終わるまで画面に
  // 反映されないため、state ではなく ref で持つ
  const isPendingRef = useRef(false)

  const handleOpenChange = (nextOpen: boolean) => {
    // 送信中は閉じない
    if (isPendingRef.current && !nextOpen) {
      return
    }

    if (nextOpen) {
      setFormKey((key) => key + 1)
    }

    setOpen(nextOpen)
  }

  const handleAction = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    isPendingRef.current = true

    let result: FormState

    try {
      result = await action(currentState, formData)
    } catch (error) {
      // `redirect()` などの Next.js が使う例外は、そのまま Next.js に渡す
      unstable_rethrow(error)

      return { error: SERVER_ACTION_FALLBACK_ERROR }
    } finally {
      isPendingRef.current = false
    }

    if (result.success) {
      setOpen(false)
      onSuccess?.()
    }

    return result
  }

  const preventWhilePending = (event: Event) => {
    if (isPendingRef.current) {
      event.preventDefault()
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          className={twMerge('overflow-y-auto', SIZE_CLASS_NAMES[size])}
          onEscapeKeyDown={preventWhilePending}
          onInteractOutside={preventWhilePending}
          // 説明がないときに、Radix UI が説明の不足を警告しないようにする
          {...(description ? {} : { 'aria-describedby': undefined })}
        >
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
          <Form action={handleAction} className="space-y-4" key={formKey}>
            {children}
            <FormDialogFooter submitLabel={submitLabel} />
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
