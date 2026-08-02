'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import {
  activateTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../../_actions'
import { DeleteConfirmDialog } from '../../_components/delete-confirm-dialog'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentLifecycleActionsProps {
  talent: Talent
}

export function TalentLifecycleActions({
  talent,
}: TalentLifecycleActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  const runAction = (
    confirmMessage: string,
    action: () => Promise<{ success: boolean; error?: string }>,
  ) => {
    if (!confirm(confirmMessage)) {
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        const result = await action()
        if (result.success) {
          router.refresh()
        } else {
          setError(result.error ?? '操作に失敗しました。')
        }
      } catch {
        setError('予期しないエラーが発生しました。')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {isDeleted ? (
          <Button
            disabled={isPending}
            onClick={() =>
              runAction(
                `タレント「${talent.name}」を復活しますか？\n動画の復旧はバッチで順次行われます。`,
                () => restoreTalentAction(talent.id),
              )
            }
            size="sm"
            variant="primary"
          >
            {isPending ? '処理中...' : '復活'}
          </Button>
        ) : (
          <>
            {isActive && (
              <Button
                disabled={isPending}
                onClick={() =>
                  runAction(
                    `タレント「${talent.name}」を引退にしますか？`,
                    () => retireTalentAction(talent.id),
                  )
                }
                size="sm"
                variant="secondary"
              >
                {isPending ? '処理中...' : '引退にする'}
              </Button>
            )}
            {isRetired && (
              <Button
                disabled={isPending}
                onClick={() =>
                  runAction(
                    `タレント「${talent.name}」をアクティブに戻しますか？`,
                    () => activateTalentAction(talent.id),
                  )
                }
                size="sm"
                variant="secondary-blue"
              >
                {isPending ? '処理中...' : 'アクティブに戻す'}
              </Button>
            )}
            <DeleteConfirmDialog
              talentId={talent.id}
              talentName={talent.name}
            />
          </>
        )}
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  )
}
