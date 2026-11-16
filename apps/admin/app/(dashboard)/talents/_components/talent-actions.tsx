'use client'

import type { Tables } from '@shinju-date/database'
import { EllipsisVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import {
  activateTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../_actions'
import { syncTalentAccounts } from '../_actions/sync'
import { useTalentLifecycleAction } from '../_lib/use-talent-lifecycle-action'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentActionsProps {
  talent: Talent
}

export function TalentActions({ talent }: TalentActionsProps) {
  const router = useRouter()
  const {
    isPending: isLifecyclePending,
    message,
    run,
    setMessage,
  } = useTalentLifecycleAction()
  const [isSyncPending, startSyncTransition] = useTransition()
  const isPending = isLifecyclePending || isSyncPending
  const { showToast, toastProps } = useActionToast()

  // 一覧の行の中には結果を表示する場所がないため、トーストで知らせる
  useEffect(() => {
    if (message) {
      showToast(message.type, message.text)
    }
  }, [message])

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  const handleSync = () => {
    setMessage(null)
    startSyncTransition(async () => {
      try {
        const result = await syncTalentAccounts(talent.id)
        if (result.success) {
          setMessage({
            text:
              result.message ??
              (result.unchanged
                ? 'アカウント情報は既に最新です。'
                : 'アカウント情報を同期しました。'),
            type: 'success',
          })
        } else {
          setMessage({
            text: result.error || '同期に失敗しました。',
            type: 'danger',
          })
        }
        // A platform may have been updated even when another one failed.
        if (result.unchanged === false) {
          router.refresh()
        }
      } catch {
        setMessage({ text: '予期しないエラーが発生しました。', type: 'danger' })
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`「${talent.name}」の操作`}
          disabled={isPending}
        >
          <EllipsisVertical aria-hidden="true" className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {isDeleted ? (
            <DropdownMenuItem
              onClick={() =>
                run(() => restoreTalentAction(talent.id), {
                  confirmMessage: `タレント「${talent.name}」を復活しますか？`,
                  successText: 'タレントを復活しました。',
                })
              }
            >
              復活
            </DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onClick={handleSync}>同期</DropdownMenuItem>
              {isActive && (
                <DropdownMenuItem
                  onClick={() =>
                    run(() => retireTalentAction(talent.id), {
                      confirmMessage: `タレント「${talent.name}」を引退にしますか？`,
                      successText: 'タレントを引退にしました。',
                    })
                  }
                >
                  引退にする
                </DropdownMenuItem>
              )}
              {isRetired && (
                <DropdownMenuItem
                  onClick={() =>
                    run(() => activateTalentAction(talent.id), {
                      confirmMessage: `タレント「${talent.name}」をアクティブに戻しますか？`,
                      successText: 'タレントをアクティブに戻しました。',
                    })
                  }
                >
                  アクティブに戻す
                </DropdownMenuItem>
              )}
              <hr className="my-1 border-border" />
              <DropdownMenuItem
                onClick={() =>
                  run(() => deleteTalentAction(talent.id), {
                    confirmMessage: `タレント「${talent.name}」を削除しますか？`,
                    successText: 'タレントを削除しました。',
                  })
                }
                variant="danger"
              >
                削除
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionToast {...toastProps} />
    </>
  )
}
