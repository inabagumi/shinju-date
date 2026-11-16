'use client'

import type { Tables } from '@shinju-date/database'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  EmptyState,
  Button as UIButton,
} from '@shinju-date/ui'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
import { Panel } from '@/components/panel'
import {
  addTwitchUserAction,
  removeTwitchUserAction,
} from '../../_actions/twitch-users'

type TwitchUser = Pick<
  Tables<'twitch_users'>,
  'id' | 'name' | 'twitch_user_id' | 'twitch_login_name'
>

interface TwitchUserManagerProps {
  talentId: string
  users: TwitchUser[]
  isDeleted: boolean
}

export function TwitchUserManager({
  talentId,
  users,
  isDeleted,
}: TwitchUserManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  // Kept after the dialog closes so that its content stays while it fades out.
  const [removalTarget, setRemovalTarget] = useState<TwitchUser | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const { showToast, toastProps } = useActionToast()

  const handleAddUser = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const result = await addTwitchUserAction(currentState, formData)

    if (result.success) {
      setIsAddDialogOpen(false)
    }

    return result
  }

  const handleRemoveUser = async (userId: string) => {
    setDeletingUserId(userId)
    try {
      const result = await removeTwitchUserAction(userId, talentId)

      if (!result.success) {
        showToast(
          'danger',
          result.error || 'Twitchユーザーの削除に失敗しました。',
        )
      }
    } catch {
      showToast('danger', 'Twitchユーザーの削除に失敗しました。')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div>
      <Panel
        actions={
          !isDeleted && (
            <Dialog onOpenChange={setIsAddDialogOpen} open={isAddDialogOpen}>
              <UIButton
                onClick={() => setIsAddDialogOpen(true)}
                type="button"
                variant="secondary"
              >
                <Plus aria-hidden="true" className="mr-2 size-4" />
                ユーザーを追加
              </UIButton>
              <DialogPortal>
                <DialogOverlay />
                <DialogContent>
                  <DialogTitle>Twitchユーザーを追加</DialogTitle>
                  <DialogDescription>
                    ログイン名、ユーザーID、またはTwitch
                    URLを入力してください。追加時にTwitch
                    APIから表示名とログイン名を取得します。
                  </DialogDescription>
                  <Form action={handleAddUser} className="space-y-4">
                    <input name="talent_id" type="hidden" value={talentId} />
                    <FormField name="twitch_user">
                      <Label className="block text-meta font-semibold">
                        ログイン名 / ユーザーID / URL
                      </Label>
                      <Input
                        className="mt-1"
                        placeholder="login または https://twitch.tv/login"
                        required
                      />
                      <p className="mt-1 text-caption text-muted">
                        例: example、https://www.twitch.tv/example、123456789
                      </p>
                      <ErrorMessage className="mt-1 text-meta text-danger" />
                    </FormField>
                    <GenericErrorMessage className="text-meta text-danger" />
                    <div className="flex justify-end gap-2">
                      <DialogClose asChild>
                        <UIButton type="button" variant="secondary">
                          キャンセル
                        </UIButton>
                      </DialogClose>
                      <SubmitButton type="submit">追加</SubmitButton>
                    </div>
                  </Form>
                </DialogContent>
              </DialogPortal>
            </Dialog>
          )
        }
        description="タレントに紐づけられたTwitchユーザーの追加・削除"
        title="Twitchユーザー管理"
      >
        {users.length > 0 ? (
          <div className="space-y-3">
            {users.map((user) => (
              <div
                className="flex items-start justify-between gap-4 rounded-container border border-border p-4"
                key={user.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="space-y-2">
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        表示名
                      </span>
                      <p className="mt-1 text-meta">{user.name || '未取得'}</p>
                      <p className="mt-1 text-caption text-muted">
                        Twitch APIから自動更新される表示名
                      </p>
                    </div>
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        ユーザーID
                      </span>
                      <code className="mt-1 block rounded-control bg-muted px-2 py-1 font-mono text-caption break-all">
                        {user.twitch_user_id}
                      </code>
                    </div>
                    {user.twitch_login_name && (
                      <div>
                        <span className="text-caption font-semibold text-muted">
                          ログイン名
                        </span>
                        <p className="mt-1 text-caption">
                          {user.twitch_login_name}
                        </p>
                      </div>
                    )}
                    {user.twitch_login_name && (
                      <div>
                        <a
                          className="inline-flex items-center gap-1 text-meta text-accent hover:underline"
                          href={`https://www.twitch.tv/${encodeURIComponent(user.twitch_login_name)}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          Twitchで開く
                          <ExternalLink aria-hidden="true" className="size-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {!isDeleted && (
                  <UIButton
                    aria-label="ユーザーを削除"
                    className="shrink-0 px-2"
                    disabled={deletingUserId === user.id}
                    onClick={() => {
                      setRemovalTarget(user)
                      setIsRemoveDialogOpen(true)
                    }}
                    size="sm"
                    title="ユーザーを削除"
                    type="button"
                    variant="danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </UIButton>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            className="py-4"
            title="登録されているTwitchユーザーがありません"
          />
        )}
      </Panel>
      <ConfirmDialog
        confirmLabel="削除"
        confirmVariant="danger"
        description={
          'このTwitchユーザーを削除してもよろしいですか？\n関連する動画データは削除されません。'
        }
        onConfirm={() => {
          if (removalTarget) {
            void handleRemoveUser(removalTarget.id)
          }
        }}
        onOpenChange={setIsRemoveDialogOpen}
        open={isRemoveDialogOpen}
        title="Twitchユーザーを削除"
      >
        {removalTarget && (
          <>
            <p className="font-semibold">
              {removalTarget.name ||
                removalTarget.twitch_login_name ||
                '未取得'}
            </p>
            <code className="mt-1 block font-mono text-caption break-all">
              {removalTarget.twitch_user_id}
            </code>
          </>
        )}
      </ConfirmDialog>
      <ActionToast {...toastProps} />
    </div>
  )
}
