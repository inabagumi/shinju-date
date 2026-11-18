'use client'

import { twMerge } from '@shinju-date/ui'
import { useState } from 'react'
import { type ActionResult, ConfirmDialog } from '@/components/confirm-dialog'
import { Panel } from '@/components/panel'
import ToggleSwitch from '@/components/toggle-switch'
import {
  disableMaintenanceModeAction,
  enableMaintenanceModeAction,
} from '../_actions/maintenance-mode'

interface MaintenanceModeWidgetProps {
  initialStatus: boolean
}

type MaintenanceModeOperation = 'enable' | 'disable'

const MAINTENANCE_MODE_OPERATIONS = {
  disable: {
    action: disableMaintenanceModeAction,
    confirmLabel: '無効にする',
    confirmVariant: 'primary',
    description: '一般ユーザーのアクセスとバッチ処理が再開されます。',
    fallbackError: 'メンテナンスモードの無効化に失敗しました。',
    title: 'メンテナンスモードを無効にしますか？',
  },
  enable: {
    action: enableMaintenanceModeAction,
    confirmLabel: '有効にする',
    confirmVariant: 'danger',
    description:
      '一般ユーザーのアクセスがメンテナンスページに切り替わり、バッチ処理が停止されます。',
    fallbackError: 'メンテナンスモードの有効化に失敗しました。',
    title: 'メンテナンスモードを有効にしますか？',
  },
} as const

export function MaintenanceModeWidget({
  initialStatus,
}: MaintenanceModeWidgetProps) {
  const [isEnabled, setIsEnabled] = useState(initialStatus)
  // 閉じるアニメーションの間も文言を保つため、開閉とは別に操作を持つ
  const [operation, setOperation] = useState<MaintenanceModeOperation>('enable')
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const config = MAINTENANCE_MODE_OPERATIONS[operation]

  const handleToggle = (checked: boolean) => {
    setOperation(checked ? 'enable' : 'disable')
    setIsConfirmOpen(true)
  }

  const handleConfirm = async (): Promise<ActionResult> => {
    const result = await config.action()

    if (!result.success) {
      return { error: result.error ?? config.fallbackError, success: false }
    }

    setIsEnabled(operation === 'enable')

    return { success: true }
  }

  return (
    <Panel title="メンテナンスモード">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="font-semibold">
              現在の状態:{' '}
              <span
                className={twMerge(
                  'font-bold',
                  isEnabled ? 'text-danger' : 'text-success',
                )}
              >
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </p>
            <p className="mt-1 text-meta text-muted">
              {isEnabled
                ? '一般ユーザーのアクセスとバッチ処理が停止されています'
                : '通常運転中です'}
            </p>
          </div>
          <div className="shrink-0">
            <ToggleSwitch
              checked={isEnabled}
              label="メンテナンスモード切り替え"
              onChange={handleToggle}
            />
          </div>
        </div>

        <div className="rounded-container bg-muted p-4">
          <p className="mb-2 text-meta font-semibold">注意事項</p>
          <ul className="list-inside list-disc space-y-1 text-meta text-muted">
            <li>管理画面は通常通りアクセス可能です</li>
            <li>データベース移行などの重要な作業時に使用してください</li>
            <li>作業完了後は必ず無効化してください</li>
          </ul>
        </div>
      </div>
      <ConfirmDialog
        confirmLabel={config.confirmLabel}
        confirmVariant={config.confirmVariant}
        description={config.description}
        onConfirm={handleConfirm}
        onOpenChange={setIsConfirmOpen}
        open={isConfirmOpen}
        pendingLabel="処理中..."
        title={config.title}
      />
    </Panel>
  )
}
