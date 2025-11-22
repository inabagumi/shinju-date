'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
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

type Channel = {
  id: string
  name: string | null
  youtube_channel_id: string
  youtube_handle: string | null
}

type ChannelManagerProps = {
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
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
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
                <button
                  className="inline-flex items-center rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground text-sm hover:opacity-90"
                  onClick={() => setIsAddDialogOpen(true)}
                  type="button"
                >
                  <Plus className="mr-2 size-4" />
                  チャンネルを追加
                </button>
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
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-secondary-blue focus:outline-none"
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
                          <button
                            className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
                            type="button"
                          >
                            キャンセル
                          </button>
                        </DialogClose>
                        <Button
                          className="rounded-md bg-secondary-blue px-4 py-2 text-secondary-blue-foreground hover:opacity-90 disabled:opacity-50"
                          type="submit"
                        >
                          追加
                        </Button>
                      </div>
                    </Form>
                  </DialogContent>
                </DialogPortal>
              </Dialog>
            )}
          </div>
        </div>
        <div className="border-gray-200 border-t px-4 py-5 sm:px-6">
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
                          className="inline-flex items-center text-blue-600 text-sm hover:text-blue-800"
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
                    <button
                      className="ml-4 text-red-600 hover:text-red-800 disabled:opacity-50"
                      disabled={deletingChannelId === channel.id}
                      onClick={() => handleRemoveChannel(channel.id)}
                      title="チャンネルを削除"
                      type="button"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              登録されているチャンネルがありません
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
