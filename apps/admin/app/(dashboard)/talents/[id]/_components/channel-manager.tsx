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
  addYouTubeChannelAction,
  removeYouTubeChannelAction,
} from '../../_actions/channels'

type Channel = Pick<
  Tables<'youtube_channels'>,
  'id' | 'name' | 'youtube_channel_id' | 'youtube_handle'
>

interface ChannelManagerProps {
  talentId: string
  channels: Channel[]
  isDeleted: boolean
}

export function ChannelManager({
  talentId,
  channels,
  isDeleted,
}: ChannelManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(
    null,
  )

  const handleAddChannel = async (
    currentState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const result = await addYouTubeChannelAction(currentState, formData)

    // Close dialog on success
    if (result.success) {
      setIsAddDialogOpen(false)
    }

    return result
  }

  const handleRemoveChannel = async (channelId: string) => {
    if (
      !confirm(
        'このチャンネルを削除してもよろしいですか？\n関連する動画データは削除されません。',
      )
    ) {
      return
    }

    setDeletingChannelId(channelId)
    const result = await removeYouTubeChannelAction(channelId, talentId)

    if (!result.success) {
      alert(result.error || 'チャンネルの削除に失敗しました。')
    }

    setDeletingChannelId(null)
  }

  return (
    <div className="mt-6">
      <Card variant="elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                YouTubeチャンネル管理
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                タレントに紐づけられたYouTubeチャンネルの追加・削除
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
                  チャンネルを追加
                </UIButton>
                <DialogPortal>
                  <DialogOverlay />
                  <DialogContent>
                    <DialogTitle>YouTubeチャンネルを追加</DialogTitle>
                    <DialogDescription>
                      ハンドル、チャンネルID、またはYouTube
                      URLを入力してください。追加時にYouTube
                      APIから名前とハンドルを取得します。
                    </DialogDescription>
                    <Form action={handleAddChannel} className="space-y-4">
                      <input name="talent_id" type="hidden" value={talentId} />
                      <FormField name="youtube_channel_id">
                        <Label className="block text-sm font-medium">
                          ハンドル / チャンネルID / URL
                        </Label>
                        <Input
                          className="mt-1"
                          placeholder="@handle または https://youtube.com/@handle"
                          required
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          例:
                          @example、https://www.youtube.com/@example、UCxxx...
                        </p>
                        <ErrorMessage className="mt-1 text-sm text-red-600" />
                      </FormField>
                      <GenericErrorMessage className="text-sm text-red-600" />
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
          {channels.length > 0 ? (
            <div className="space-y-3">
              {channels.map((channel) => (
                <div
                  className="flex items-start justify-between rounded-md border border-gray-200 p-4"
                  key={channel.id}
                >
                  <div className="min-w-0 flex-1">
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-gray-700">
                          チャンネル名:
                        </span>
                        <p className="mt-1 text-sm">
                          {channel.name || '未取得'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          YouTube APIから自動更新される名前
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-700">
                          チャンネルID:
                        </span>
                        <code className="mt-1 block rounded bg-gray-100 px-2 py-1 font-mono text-xs break-all">
                          {channel.youtube_channel_id}
                        </code>
                      </div>
                      {channel.youtube_handle && (
                        <div>
                          <span className="text-xs font-medium text-gray-700">
                            ハンドル:
                          </span>
                          <p className="mt-1 text-xs">
                            {channel.youtube_handle}
                          </p>
                        </div>
                      )}
                      <div>
                        <a
                          className="inline-flex items-center text-sm text-774-blue-600 hover:text-774-blue-800"
                          href={`https://www.youtube.com/channel/${channel.youtube_channel_id}`}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          YouTubeで開く
                          <ExternalLink className="ml-1 size-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                  {!isDeleted && (
                    <UIButton
                      className="ml-4"
                      disabled={deletingChannelId === channel.id}
                      onClick={() => handleRemoveChannel(channel.id)}
                      size="sm"
                      title="チャンネルを削除"
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
            <p className="text-sm text-gray-500">
              登録されているチャンネルがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
