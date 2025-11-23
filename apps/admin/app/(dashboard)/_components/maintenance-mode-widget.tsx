'use client'

import { useState, useTransition } from 'react'
import { twMerge } from 'tailwind-merge'
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
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">メンテナンスモード</h2>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              現在の状態:{' '}
              <span
                className={twMerge(
                  'font-bold',
                  isEnabled ? 'text-red-600' : 'text-green-600',
                )}
              >
                {isEnabled ? 'ON' : 'OFF'}
              </span>
            </p>
            <p className="mt-1 text-gray-600 text-sm">
              {isEnabled
                ? '一般ユーザーのアクセスとバッチ処理が停止されています'
                : '通常運転中です'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <ToggleSwitch
              checked={isEnabled}
              disabled={isPending}
              label="メンテナンスモード切り替え"
              onChange={handleToggle}
            />
          </div>
        </div>

        {showConfirmation && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4">
            <p className="mb-3 font-medium text-gray-900">
              {pendingAction === 'enable'
                ? 'メンテナンスモードを有効にしますか?'
                : 'メンテナンスモードを無効にしますか?'}
            </p>
            <p className="mb-4 text-gray-700 text-sm">
              {pendingAction === 'enable'
                ? '一般ユーザーのアクセスがメンテナンスページに切り替わり、バッチ処理が停止されます。'
                : '一般ユーザーのアクセスとバッチ処理が再開されます。'}
            </p>
            {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                disabled={isPending}
                onClick={handleConfirm}
                type="button"
              >
                {isPending ? '処理中...' : '確認'}
              </button>
              <button
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                disabled={isPending}
                onClick={handleCancel}
                type="button"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-4">
          <p className="mb-2 font-medium text-gray-900 text-sm">注意事項</p>
          <ul className="list-inside list-disc space-y-1 text-gray-700 text-sm">
            <li>管理画面は通常通りアクセス可能です</li>
            <li>データベース移行などの重要な作業時に使用してください</li>
            <li>作業完了後は必ず無効化してください</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
