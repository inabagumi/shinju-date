'use client'

import { Alert, Button, twMerge } from '@shinju-date/ui'
import { useState, useTransition } from 'react'
import { Panel } from '@/components/panel'
import ToggleSwitch from '@/components/toggle-switch'
import {
  disableMaintenanceMode,
  enableMaintenanceMode,
} from '../_lib/maintenance-mode-actions'

interface MaintenanceModeWidgetProps {
  initialStatus: boolean
}

export function MaintenanceModeWidget({
  initialStatus,
}: MaintenanceModeWidgetProps) {
  const [isEnabled, setIsEnabled] = useState(initialStatus)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    'enable' | 'disable' | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleToggle: (checked: boolean) => void = (checked) => {
    setPendingAction(checked ? 'enable' : 'disable')
    setShowConfirmation(true)
    setError(null)
  }

  const handleConfirm = () => {
    startTransition(async () => {
      if (pendingAction === 'enable') {
        const result = await enableMaintenanceMode()
        if (result.success) {
          setIsEnabled(true)
          setShowConfirmation(false)
          setPendingAction(null)
        } else {
          setError(result.error ?? 'メンテナンスモードの有効化に失敗しました。')
        }
      } else if (pendingAction === 'disable') {
        const result = await disableMaintenanceMode()
        if (result.success) {
          setIsEnabled(false)
          setShowConfirmation(false)
          setPendingAction(null)
        } else {
          setError(result.error ?? 'メンテナンスモードの無効化に失敗しました。')
        }
      }
    })
  }

  const handleCancel = () => {
    setShowConfirmation(false)
    setPendingAction(null)
    setError(null)
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
              disabled={isPending}
              label="メンテナンスモード切り替え"
              onChange={handleToggle}
            />
          </div>
        </div>

        {showConfirmation && (
          <Alert
            title={
              pendingAction === 'enable'
                ? 'メンテナンスモードを有効にしますか?'
                : 'メンテナンスモードを無効にしますか?'
            }
            tone="warning"
          >
            <p className="mb-4">
              {pendingAction === 'enable'
                ? '一般ユーザーのアクセスがメンテナンスページに切り替わり、バッチ処理が停止されます。'
                : '一般ユーザーのアクセスとバッチ処理が再開されます。'}
            </p>
            {error && (
              <p className="mb-4 text-danger" role="alert">
                {error}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                disabled={isPending}
                onClick={handleConfirm}
                type="button"
                variant="primary"
              >
                {isPending ? '処理中...' : '確認'}
              </Button>
              <Button
                disabled={isPending}
                onClick={handleCancel}
                type="button"
                variant="secondary"
              >
                キャンセル
              </Button>
            </div>
          </Alert>
        )}

        <div className="rounded-container bg-muted p-4">
          <p className="mb-2 text-meta font-semibold">注意事項</p>
          <ul className="list-inside list-disc space-y-1 text-meta text-muted">
            <li>管理画面は通常通りアクセス可能です</li>
            <li>データベース移行などの重要な作業時に使用してください</li>
            <li>作業完了後は必ず無効化してください</li>
          </ul>
        </div>
      </div>
    </Panel>
  )
}
