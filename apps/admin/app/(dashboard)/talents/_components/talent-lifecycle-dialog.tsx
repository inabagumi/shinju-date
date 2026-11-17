'use client'

import type { Tables } from '@shinju-date/database'
import type { ButtonProps } from '@shinju-date/ui'
import type { ReactElement } from 'react'
import { type ActionResult, ConfirmDialog } from '@/components/confirm-dialog'
import {
  activateTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../_actions'

/** タレントの状態を変える操作の種類 */
export type TalentLifecycleOperation =
  | 'activate'
  | 'delete'
  | 'restore'
  | 'retire'

type Talent = Pick<Tables<'talents'>, 'id' | 'name'>

interface TalentLifecycleOperationConfig {
  action: (id: string) => Promise<ActionResult>
  title: string
  description: (talent: Talent) => string
  confirmLabel: string
  confirmVariant: ButtonProps['variant']
  pendingLabel: string
  /** 成功したときに `onSuccess` へ渡す文 */
  successText: string
}

const TALENT_LIFECYCLE_OPERATIONS = {
  activate: {
    action: activateTalentAction,
    confirmLabel: 'アクティブに戻す',
    confirmVariant: 'primary',
    description: (talent) =>
      `タレント「${talent.name}」をアクティブに戻しますか？`,
    pendingLabel: '処理中...',
    successText: 'タレントをアクティブに戻しました。',
    title: 'タレントをアクティブに戻す',
  },
  delete: {
    action: deleteTalentAction,
    confirmLabel: '削除',
    confirmVariant: 'danger',
    description: (talent) =>
      `タレント「${talent.name}」を削除しますか？\n紐づく動画も非公開になります。`,
    pendingLabel: '削除中...',
    successText: 'タレントを削除しました。',
    title: 'タレントを削除',
  },
  restore: {
    action: restoreTalentAction,
    confirmLabel: '復活',
    confirmVariant: 'primary',
    description: (talent) =>
      `タレント「${talent.name}」を復活しますか？\n動画の復旧も行われます。`,
    pendingLabel: '復活中...',
    successText: 'タレントを復活しました。',
    title: 'タレントを復活',
  },
  retire: {
    action: retireTalentAction,
    confirmLabel: '引退にする',
    confirmVariant: 'primary',
    description: (talent) => `タレント「${talent.name}」を引退にしますか？`,
    pendingLabel: '処理中...',
    successText: 'タレントを引退にしました。',
    title: 'タレントを引退にする',
  },
} as const satisfies Record<
  TalentLifecycleOperation,
  TalentLifecycleOperationConfig
>

interface TalentLifecycleDialogBaseProps {
  operation: TalentLifecycleOperation
  talent: Talent
  /** 操作が成功したときに、結果を知らせる文を受け取る */
  onSuccess?: ((text: string) => void) | undefined
}

interface ControlledTalentLifecycleDialogProps
  extends TalentLifecycleDialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: undefined
}

interface UncontrolledTalentLifecycleDialogProps
  extends TalentLifecycleDialogBaseProps {
  open?: undefined
  onOpenChange?: undefined
  /** 開くためのボタン。開閉の状態は部品の中で持つ */
  trigger: ReactElement
}

export type TalentLifecycleDialogProps =
  | ControlledTalentLifecycleDialogProps
  | UncontrolledTalentLifecycleDialogProps

/**
 * タレントの復活・引退・アクティブ化・削除を確かめてから実行するダイアログ。
 * 一覧と詳細で共通に使う。実行中の表示と失敗の表示は `ConfirmDialog` が受け持ち、
 * 成功したら閉じる（ページの再取得は、アクションの `revalidatePath` に任せる）。
 */
export function TalentLifecycleDialog({
  onSuccess,
  operation,
  talent,
  ...dialogProps
}: TalentLifecycleDialogProps) {
  const config = TALENT_LIFECYCLE_OPERATIONS[operation]

  const handleConfirm = async () => {
    const result = await config.action(talent.id)

    if (result.success) {
      onSuccess?.(config.successText)
    }

    return result
  }

  return (
    <ConfirmDialog
      {...dialogProps}
      confirmLabel={config.confirmLabel}
      confirmVariant={config.confirmVariant}
      description={config.description(talent)}
      onConfirm={handleConfirm}
      pendingLabel={config.pendingLabel}
      title={config.title}
    />
  )
}
