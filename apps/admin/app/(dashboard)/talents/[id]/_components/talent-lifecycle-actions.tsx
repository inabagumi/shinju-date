'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  activateTalentAction,
  deleteTalentAction,
  restoreTalentAction,
  retireTalentAction,
} from '../../_actions'
import { useTalentLifecycleAction } from '../../_lib/use-talent-lifecycle-action'

type Talent = Pick<Tables<'talents'>, 'id' | 'name' | 'status' | 'deleted_at'>

interface TalentLifecycleActionsProps {
  talent: Talent
}

export function TalentLifecycleActions({
  talent,
}: TalentLifecycleActionsProps) {
  const { isPending, message, run } = useTalentLifecycleAction()

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'
  const isActive = !isDeleted && talent.status === 'active'

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {isDeleted ? (
          <Button
            disabled={isPending}
            onClick={() =>
              run(() => restoreTalentAction(talent.id), {
                confirmMessage: `タレント「${talent.name}」を復活しますか？\n動画の復旧も行われます。`,
              })
            }
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
                  run(() => retireTalentAction(talent.id), {
                    confirmMessage: `タレント「${talent.name}」を引退にしますか？`,
                  })
                }
                variant="secondary"
              >
                {isPending ? '処理中...' : '引退にする'}
              </Button>
            )}
            {isRetired && (
              <Button
                disabled={isPending}
                onClick={() =>
                  run(() => activateTalentAction(talent.id), {
                    confirmMessage: `タレント「${talent.name}」をアクティブに戻しますか？`,
                  })
                }
                variant="secondary"
              >
                {isPending ? '処理中...' : 'アクティブに戻す'}
              </Button>
            )}
            <ConfirmDialog
              confirmLabel="削除"
              confirmVariant="danger"
              description={`「${talent.name}」を削除しますか？紐づく動画も非公開になります。`}
              onConfirm={() => deleteTalentAction(talent.id)}
              title="タレントを削除"
              trigger={<Button variant="danger">削除</Button>}
            />
          </>
        )}
      </div>
      {message?.type === 'danger' && (
        <p className="text-meta text-danger" role="alert">
          {message.text}
        </p>
      )}
    </div>
  )
}
