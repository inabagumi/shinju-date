'use client'

import { useState } from 'react'
import type { ActionResult, ConfirmHandler } from '@/components/confirm-dialog'
import { useServerAction } from '@/lib/use-server-action'
import {
  getVideoActionSuccessText,
  runVideoAction,
  type VideoAction,
  type VideoActionTarget,
} from './video-actions'

export interface UseVideoActionOptions {
  /** 操作が成功したときに、トーストを出したあとで呼ばれる */
  onSuccess?: ((action: VideoAction) => void) | undefined
}

/** `VideoActionConfirmDialog` にそのまま渡す値 */
export interface VideoActionDialogProps {
  action: VideoAction
  videos: readonly VideoActionTarget[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: ConfirmHandler
}

export interface UseVideoActionReturn {
  /** 操作と対象の動画を指定して、確認のダイアログを開く */
  openDialog: (
    action: VideoAction,
    targets: readonly VideoActionTarget[],
  ) => void
  dialogProps: VideoActionDialogProps
}

interface DialogState {
  action: VideoAction
  open: boolean
  targets: readonly VideoActionTarget[]
}

/**
 * 動画の操作（表示の切り替え・削除・復元）を、確認のダイアログで確かめてから
 * 実行し、結果をトーストで知らせる。呼ぶアクションと文は `VIDEO_ACTIONS` に従う。
 *
 * ダイアログは、返した `dialogProps` を `VideoActionConfirmDialog` に渡して1つだけ
 * 描く。
 */
export function useVideoAction({
  onSuccess,
}: UseVideoActionOptions = {}): UseVideoActionReturn {
  // 閉じる途中も文言が変わらないよう、操作の種類と対象は閉じても残す
  const [dialog, setDialog] = useState<DialogState>({
    action: 'toggle',
    open: false,
    targets: [],
  })
  const { run } = useServerAction(runVideoAction, {
    onSuccess: (result) => onSuccess?.(result.action),
    successText: getVideoActionSuccessText,
  })

  const openDialog = (
    action: VideoAction,
    targets: readonly VideoActionTarget[],
  ) => {
    setDialog({ action, open: true, targets })
  }

  const handleConfirm = async (): Promise<ActionResult | undefined> => {
    // 確認のダイアログに表示した動画だけを操作する
    if (dialog.targets.length === 0) {
      return { error: '動画が選択されていません。', success: false }
    }

    // 結果はトーストで知らせ、成否にかかわらずダイアログを閉じる
    await run(dialog.action, dialog.targets)

    return undefined
  }

  return {
    dialogProps: {
      action: dialog.action,
      onConfirm: handleConfirm,
      onOpenChange: (open) => setDialog((prev) => ({ ...prev, open })),
      open: dialog.open,
      videos: dialog.targets,
    },
    openDialog,
  }
}
