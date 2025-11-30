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
  Button,
  ErrorMessage,
  FormField,
  GenericErrorMessage,
  Input,
  Label,
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
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                YouTubeチャンネル管理
              </h3>
              <p className="mt-1 max-w-2xl text-gray-500 text-sm">
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
                      YouTubeチャンネルIDまたはURLを入力してください。
                    </DialogDescription>
                    <Form action={handleAddChannel} className="space-y-4">
                      <input name="talent_id" type="hidden" value={talentId} />
                      <FormField name="youtube_channel_id">
                        <Label className="block font-medium text-sm">
                          チャンネルIDまたはURL
                        </Label>
                        <Input
                          className="mt-1"
                          placeholder="UC... または https://youtube.com/channel/UC..."
                          required
                        />
                        <p className="mt-1 text-gray-500 text-xs">
                          例: UCxxxxxxxxxxxxxxxx または
                          https://youtube.com/channel/UCxxxxxxxxxxxxxxxx
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
                        <Button type="submit" variant="secondary-blue">
                          追加
                        </Button>
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
                        <span className="font-medium text-gray-700 text-xs">
                          チャンネル名:
                        </span>
                        <p className="mt-1 text-sm">
                          {channel.name || '未取得'}
                        </p>
                        <p className="mt-1 text-gray-500 text-xs">
                          YouTube APIから自動更新される名前
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 text-xs">
                          チャンネルID:
                        </span>
                        <code className="mt-1 block break-all rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                          {channel.youtube_channel_id}
                        </code>
                      </div>
                      {channel.youtube_handle && (
                        <div>
                          <span className="font-medium text-gray-700 text-xs">
                            ハンドル:
                          </span>
                          <p className="mt-1 text-xs">
                            {channel.youtube_handle}
                          </p>
                        </div>
                      )}
                      <div>
                        <a
                          className="inline-flex items-center text-774-blue-600 text-sm hover:text-774-blue-800"
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
            <p className="text-gray-500 text-sm">
              登録されているチャンネルがありません
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
