'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { Loader2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../../_actions'
import { syncVideoWithTwitch, syncVideoWithYouTube } from '../../_actions/sync'
import { VideoActionConfirmDialog } from '../../_components/video-action-confirm-dialog'

type VideoInfo = Pick<Tables<'videos'>, 'id' | 'title'>

interface SyncVideoButtonProps {
  videoId: string
  platform: Tables<'videos'>['platform']
}

function SyncVideoButton({ videoId, platform }: SyncVideoButtonProps) {
  const [isPending, startTransition] = useTransition()
  const { showToast, toastProps } = useActionToast()

  const label = platform === 'twitch' ? 'Twitchと同期' : 'YouTubeと同期'

  const handleSync = () => {
    startTransition(async () => {
      try {
        const result =
          platform === 'twitch'
            ? await syncVideoWithTwitch(videoId)
            : await syncVideoWithYouTube(videoId)
        if (result.success) {
          showToast(
            'success',
            result.message ??
              (result.unchanged
                ? '動画情報は既に最新です。'
                : '動画情報を同期しました。'),
          )
        } else {
          showToast('error', result.error || '同期に失敗しました。')
        }
      } catch (_error) {
        showToast('error', '予期しないエラーが発生しました。')
      }
    })
  }

  return (
    <>
      <Button disabled={isPending} onClick={handleSync} variant="primary">
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPending ? '同期中...' : label}
      </Button>

      <ActionToast {...toastProps} />
    </>
  )
}

interface VideoActionsButtonsProps {
  video: Pick<
    Tables<'videos'>,
    'id' | 'title' | 'visible' | 'deleted_at' | 'platform'
  >
}

export function VideoActionsButtons({ video }: VideoActionsButtonsProps) {
  const [isPending, _startTransition] = useTransition()
  const { showToast, toastProps } = useActionToast()
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'toggle' | 'delete' | 'restore'
    open: boolean
  }>({ action: 'toggle', open: false })

  const isDeleted = video.deleted_at !== null
  const videoInfo: VideoInfo = { id: video.id, title: video.title }

  const handleToggleVisibility = () => {
    setConfirmDialog({ action: 'toggle', open: true })
  }

  const handleDelete = () => {
    setConfirmDialog({ action: 'delete', open: true })
  }

  const handleRestore = () => {
    setConfirmDialog({ action: 'restore', open: true })
  }

  const handleConfirm = async () => {
    const { action } = confirmDialog

    try {
      if (action === 'toggle') {
        const result = await toggleVisibilityAction([video.id])
        if (result.success) {
          showToast(
            'success',
            `動画を${video.visible ? '非表示' : '表示'}に変更しました。`,
          )
        } else {
          showToast('error', result.error || '操作に失敗しました。')
        }
      } else if (action === 'delete') {
        const result = await softDeleteAction([video.id])
        if (result.success) {
          showToast('success', '動画を削除しました。')
        } else {
          showToast('error', result.error || '削除に失敗しました。')
        }
      } else if (action === 'restore') {
        const result = await restoreAction([video.id])
        if (result.success) {
          showToast('success', '動画を復元しました。')
        } else {
          showToast('error', result.error || '復元に失敗しました。')
        }
      }
    } catch (error) {
      showToast(
        'error',
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      )
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div className="flex gap-2">
          {isDeleted ? (
            <Button
              disabled={isPending}
              onClick={handleRestore}
              variant="primary"
            >
              復元
            </Button>
          ) : (
            <>
              <Button
                disabled={isPending}
                onClick={handleToggleVisibility}
                variant="secondary"
              >
                {video.visible ? '非表示にする' : '表示する'}
              </Button>
              <Button
                disabled={isPending}
                onClick={handleDelete}
                variant="danger"
              >
                削除
              </Button>
            </>
          )}
        </div>
        {!isDeleted && (
          <SyncVideoButton platform={video.platform} videoId={video.id} />
        )}
      </div>

      <ActionToast {...toastProps} />

      <VideoActionConfirmDialog
        action={confirmDialog.action}
        onConfirm={handleConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        videos={[videoInfo]}
      />
    </>
  )
}
