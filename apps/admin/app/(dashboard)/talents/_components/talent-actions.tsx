'use client'

import type { Tables } from '@shinju-date/database'
import { EllipsisVertical } from 'lucide-react'
import { useEffect } from 'react'
import { useActionToast } from '@/components/action-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import { useServerAction } from '@/lib/use-server-action'
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
  const {
    isPending: isLifecyclePending,
    message,
    run,
  } = useTalentLifecycleAction()
  const { isPending: isSyncPending, run: runSync } = useServerAction(
    syncTalentAccounts,
    {
      errorText: '同期に失敗しました。',
      successText: (result) =>
        result.message ??
        (result.unchanged
          ? 'アカウント情報は既に最新です。'
          : 'アカウント情報を同期しました。'),
    },
  )
  const isPending = isLifecyclePending || isSyncPending
  const { showToast } = useActionToast()

  // 一覧の行の中には結果を表示する場所がないため、トーストで知らせる
  useEffect(() => {
    if (message) {
      showToast(message.type, message.text)
    }
  }, [message])

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  return (
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
            <DropdownMenuItem onClick={() => runSync(talent.id)}>
              同期
            </DropdownMenuItem>
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
  )
}
