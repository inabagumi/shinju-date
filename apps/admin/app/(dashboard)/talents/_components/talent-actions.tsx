'use client'

import type { Tables } from '@shinju-date/database'
import { EllipsisVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import { syncTalentAccounts } from '../_actions/sync'
import {
  TalentLifecycleDialog,
  type TalentLifecycleOperation,
} from './talent-lifecycle-dialog'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentActionsProps {
  talent: Talent
}

export function TalentActions({ talent }: TalentActionsProps) {
  const router = useRouter()
  const [isSyncPending, startSyncTransition] = useTransition()
  // メニューは項目を押すと閉じて中身が消えるため、ダイアログはメニューの外に置き、
  // 開いている操作をここで持つ。閉じる途中も文言が変わらないよう、操作の種類は
  // 閉じても残す
  const [lifecycleDialog, setLifecycleDialog] = useState<{
    open: boolean
    operation: TalentLifecycleOperation
  }>({ open: false, operation: 'delete' })
  // 一覧の行の中には結果を表示する場所がないため、トーストで知らせる
  const { showToast, toastProps } = useActionToast()

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  const openLifecycleDialog = (operation: TalentLifecycleOperation) => {
    setLifecycleDialog({ open: true, operation })
  }

  const handleSync = () => {
    startSyncTransition(async () => {
      try {
        const result = await syncTalentAccounts(talent.id)
        if (result.success) {
          showToast(
            'success',
            result.message ??
              (result.unchanged
                ? 'アカウント情報は既に最新です。'
                : 'アカウント情報を同期しました。'),
          )
        } else {
          showToast('danger', result.error || '同期に失敗しました。')
        }
        // A platform may have been updated even when another one failed.
        if (result.unchanged === false) {
          router.refresh()
        }
      } catch {
        showToast('danger', '予期しないエラーが発生しました。')
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`「${talent.name}」の操作`}
          disabled={isSyncPending}
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isDeleted ? (
            <DropdownMenuItem onClick={() => openLifecycleDialog('restore')}>
              復活
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={handleSync}>同期</DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem onClick={() => openLifecycleDialog('retire')}>
                  引退にする
                </DropdownMenuItem>
              )}
              {isRetired && (
                <DropdownMenuItem
                  onClick={() => openLifecycleDialog('activate')}
                >
                  アクティブに戻す
                </DropdownMenuItem>
              )}
              <hr className="my-1 border-border" />
              <DropdownMenuItem
                onClick={() => openLifecycleDialog('delete')}
                variant="danger"
              >
                削除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <TalentLifecycleDialog
        onOpenChange={(open) =>
          setLifecycleDialog((prev) => ({ ...prev, open }))
        }
        onSuccess={(text) => showToast('success', text)}
        open={lifecycleDialog.open}
        operation={lifecycleDialog.operation}
        talent={talent}
      />
      <ActionToast {...toastProps} />
    </>
  )
}
