'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'

export interface TalentLifecycleActionResult {
  success: boolean
  error?: string
}

export interface TalentLifecycleMessage {
  type: 'success' | 'error'
  text: string
}

export interface RunTalentLifecycleActionOptions {
  /** 実行前に `confirm()` で表示するメッセージ */
  confirmMessage: string
  /** 成功時に表示するメッセージ（省略時は成功メッセージを表示しない） */
  successText?: string
}

/**
 * タレントの削除・復活・引退・アクティブ化を確認ダイアログ付きで実行し、
 * 成功時にページを再取得する。一覧と詳細で共通の処理をまとめたもの。
 */
export function useTalentLifecycleAction() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<TalentLifecycleMessage | null>(null)

  const run = useCallback(
    (
      action: () => Promise<TalentLifecycleActionResult>,
      { confirmMessage, successText }: RunTalentLifecycleActionOptions,
    ) => {
      if (!confirm(confirmMessage)) {
        return
      }

      setMessage(null)
      startTransition(async () => {
        try {
          const result = await action()
          if (result.success) {
            if (successText) {
              setMessage({ text: successText, type: 'success' })
            }
            router.refresh()
          } else {
            setMessage({
              text: result.error || '操作に失敗しました。',
              type: 'error',
            })
          }
        } catch {
          setMessage({
            text: '予期しないエラーが発生しました。',
            type: 'error',
          })
        }
      })
    },
    [router],
  )

  return { isPending, message, run, setMessage }
}
