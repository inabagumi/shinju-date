'use client'

import type { Tables } from '@shinju-date/database'
import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Button as UIButton,
} from '@shinju-date/ui'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FormState } from '@/components/form'
import Form, {
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
  SubmitButton,
} from '@/components/form'
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
    if (
      !confirm(
        'このTwitchユーザーを削除してもよろしいですか？\n関連する動画データは削除されません。',
      )
    ) {
      return
    }

    setDeletingUserId(userId)
    try {
      const result = await removeTwitchUserAction(userId, talentId)

      if (!result.success) {
        alert(result.error || 'Twitchユーザーの削除に失敗しました。')
      }
    } catch {
      alert('Twitchユーザーの削除に失敗しました。')
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <div className="mt-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                Twitchユーザー管理
              </h3>
              <p className="mt-1 max-w-2xl text-gray-500 text-sm">
                タレントに紐づけられたTwitchユーザーの追加・削除
              </p>
            </div>
            {!isDeleted && (
              <Dialog onOpenChange={setIsAddDialogOpen} open={isAddDialogOpen}>
                <UIButton
                  onClick={() => setIsAddDialogOpen(true)}
                  type="button"
                  variant="secondary-blue"
                >
                  <Plus className="mr-2 size-4" />
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
                        <Label className="block font-medium text-sm">
                          ログイン名 / ユーザーID / URL
                        </Label>
                        <Input
                          className="mt-1"
                          placeholder="login または https://twitch.tv/login"
                          required
                        />
                        <p className="mt-1 text-gray-500 text-xs">
                          例: example、https://www.twitch.tv/example、123456789
                        </p>
                        <ErrorMessage className="mt-1 text-red-600 text-sm" />
                      </FormField>
                      <GenericErrorMessage className="text-red-600 text-sm" />
                      <div className="flex justify-end gap-2">
                        <DialogClose asChild>
                          <UIButton type="button" variant="secondary">
                            キャンセル
                          </UIButton>
                        </DialogClose>
                        <SubmitButton type="submit" variant="secondary-blue">
                          追加
                        </SubmitButton>
                      </div>
                    </Form>
                  </DialogContent>
                </DialogPortal>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  className="flex items-start justify-between rounded-md border border-gray-200 p-4"
                  key={user.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium text-gray-700 text-xs">
                          表示名:
                        </span>
                        <p className="mt-1 text-sm">{user.name || '未取得'}</p>
                        <p className="mt-1 text-gray-500 text-xs">
                          Twitch APIから自動更新される表示名
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 text-xs">
                          ユーザーID:
                        </span>
                        <code className="mt-1 block break-all rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                          {user.twitch_user_id}
                        </code>
                      </div>
                      {user.twitch_login_name && (
                        <div>
                          <span className="font-medium text-gray-700 text-xs">
                            ログイン名:
                          </span>
                          <p className="mt-1 text-xs">
                            {user.twitch_login_name}
                          </p>
                        </div>
                      )}
                      {user.twitch_login_name && (
                        <div>
                          <a
                            className="inline-flex items-center text-774-blue-600 text-sm hover:text-774-blue-800"
                            href={`https://www.twitch.tv/${encodeURIComponent(user.twitch_login_name)}`}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            Twitchで開く
                            <ExternalLink className="ml-1 size-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  {!isDeleted && (
                    <UIButton
                      className="ml-4"
                      disabled={deletingUserId === user.id}
                      onClick={() => handleRemoveUser(user.id)}
                      size="sm"
                      title="ユーザーを削除"
                      type="button"
                      variant="danger"
                    >
                      <Trash2 className="size-5" />
                    </UIButton>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              登録されているTwitchユーザーがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
