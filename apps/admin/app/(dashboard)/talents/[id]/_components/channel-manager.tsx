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
  // Kept after the dialog closes so that its content stays while it fades out.
  const [removalTarget, setRemovalTarget] = useState<Channel | null>(null)
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const { showToast, toastProps } = useActionToast()

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
    setDeletingChannelId(channelId)
    try {
      const result = await removeYouTubeChannelAction(channelId, talentId)

      if (!result.success) {
        showToast('danger', result.error || 'チャンネルの削除に失敗しました。')
      }
    } catch {
      showToast('danger', 'チャンネルの削除に失敗しました。')
    } finally {
      setDeletingChannelId(null)
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
                      <Label className="block text-meta font-semibold">
                        ハンドル / チャンネルID / URL
                      </Label>
                      <Input
                        className="mt-1"
                        placeholder="@handle または https://youtube.com/@handle"
                        required
                      />
                      <p className="mt-1 text-caption text-muted">
                        例: @example、https://www.youtube.com/@example、UCxxx...
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
        description="タレントに紐づけられたYouTubeチャンネルの追加・削除"
        title="YouTubeチャンネル管理"
      >
        {channels.length > 0 ? (
          <div className="space-y-3">
            {channels.map((channel) => (
              <div
                className="flex items-start justify-between gap-4 rounded-container border border-border p-4"
                key={channel.id}
              >
                <div className="min-w-0 flex-1">
                  <div className="space-y-2">
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        チャンネル名
                      </span>
                      <p className="mt-1 text-meta">
                        {channel.name || '未取得'}
                      </p>
                      <p className="mt-1 text-caption text-muted">
                        YouTube APIから自動更新される名前
                      </p>
                    </div>
                    <div>
                      <span className="text-caption font-semibold text-muted">
                        チャンネルID
                      </span>
                      <code className="mt-1 block rounded-control bg-muted px-2 py-1 font-mono text-caption break-all">
                        {channel.youtube_channel_id}
                      </code>
                    </div>
                    {channel.youtube_handle && (
                      <div>
                        <span className="text-caption font-semibold text-muted">
                          ハンドル
                        </span>
                        <p className="mt-1 text-caption">
                          {channel.youtube_handle}
                        </p>
                      </div>
                    )}
                    <div>
                      <a
                        className="inline-flex items-center gap-1 text-meta text-accent hover:underline"
                        href={`https://www.youtube.com/channel/${channel.youtube_channel_id}`}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        YouTubeで開く
                        <ExternalLink aria-hidden="true" className="size-3" />
                      </a>
                    </div>
                  </div>
                </div>
                {!isDeleted && (
                  <UIButton
                    aria-label="チャンネルを削除"
                    className="shrink-0 px-2"
                    disabled={deletingChannelId === channel.id}
                    onClick={() => {
                      setRemovalTarget(channel)
                      setIsRemoveDialogOpen(true)
                    }}
                    size="sm"
                    title="チャンネルを削除"
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
            title="登録されているチャンネルがありません"
          />
        )}
      </Panel>
      <ConfirmDialog
        confirmLabel="削除"
        confirmVariant="danger"
        description={
          'このチャンネルを削除してもよろしいですか？\n関連する動画データは削除されません。'
        }
        onConfirm={() => {
          if (removalTarget) {
            void handleRemoveChannel(removalTarget.id)
          }
        }}
        onOpenChange={setIsRemoveDialogOpen}
        open={isRemoveDialogOpen}
        title="チャンネルを削除"
      >
        {removalTarget && (
          <>
            <p className="font-semibold">{removalTarget.name || '未取得'}</p>
            <code className="mt-1 block font-mono text-caption break-all">
              {removalTarget.youtube_channel_id}
            </code>
          </>
        )}
      </ConfirmDialog>
      <ActionToast {...toastProps} />
    </div>
  )
}
