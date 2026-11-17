'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useActionToast } from '@/components/action-toast'
import { useServerAction } from '@/lib/use-server-action'
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
  const { isPending, run } = useServerAction(
    platform === 'twitch' ? syncVideoWithTwitch : syncVideoWithYouTube,
    {
      errorText: '同期に失敗しました。',
      successText: (result) =>
        result.message ??
        (result.unchanged
          ? '動画情報は既に最新です。'
          : '動画情報を同期しました。'),
    },
  )

  const label = platform === 'twitch' ? 'Twitchと同期' : 'YouTubeと同期'

  return (
    <Button
      disabled={isPending}
      onClick={() => run(videoId)}
      variant="secondary"
    >
      {isPending && (
        <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />
      )}
      {isPending ? '同期中...' : label}
    </Button>
  )
}

type VideoAction = 'toggle' | 'delete' | 'restore'

interface VideoActionsProps {
  video: Pick<
    Tables<'videos'>,
    'id' | 'title' | 'visible' | 'deleted_at' | 'platform'
  >
}

/**
 * 動画への操作（表示の切り替え・削除・復元）を確認ダイアログ付きで実行する。
 * 通常の操作と危険な操作を別の場所に置けるよう、ボタンとは分けている。
 */
function useVideoAction(video: VideoActionsProps['video']) {
  const { showToast } = useActionToast()
  const [confirmDialog, setConfirmDialog] = useState<{
    action: VideoAction
    open: boolean
  }>({ action: 'toggle', open: false })

  const videoInfo: VideoInfo = { id: video.id, title: video.title }

  const openDialog = (action: VideoAction) => {
    setConfirmDialog({ action, open: true })
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
          showToast('danger', result.error || '操作に失敗しました。')
        }
      } else if (action === 'delete') {
        const result = await softDeleteAction([video.id])
        if (result.success) {
          showToast('success', '動画を削除しました。')
        } else {
          showToast('danger', result.error || '削除に失敗しました。')
        }
      } else if (action === 'restore') {
        const result = await restoreAction([video.id])
        if (result.success) {
          showToast('success', '動画を復元しました。')
        } else {
          showToast('danger', result.error || '復元に失敗しました。')
        }
      }
    } catch (error) {
      showToast(
        'danger',
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      )
    }
  }

  const dialog = (
    <VideoActionConfirmDialog
      action={confirmDialog.action}
      onConfirm={handleConfirm}
      onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      open={confirmDialog.open}
      videos={[videoInfo]}
    />
  )

  return { dialog, openDialog }
}

/** 見出しの右端に置く通常の操作（同期・表示の切り替え・復元） */
export function VideoActionsButtons({ video }: VideoActionsProps) {
  const { dialog, openDialog } = useVideoAction(video)
  const isDeleted = video.deleted_at !== null

  return (
    <>
      {isDeleted ? (
        <Button onClick={() => openDialog('restore')} variant="primary">
          復元
        </Button>
      ) : (
        <>
          <Button onClick={() => openDialog('toggle')} variant="secondary">
            {video.visible ? '非表示にする' : '表示する'}
          </Button>
          <SyncVideoButton platform={video.platform} videoId={video.id} />
        </>
      )}

      {dialog}
    </>
  )
}

/** ページの末尾に、通常の操作と離して置く削除のボタン */
export function VideoDeleteButton({ video }: VideoActionsProps) {
  const { dialog, openDialog } = useVideoAction(video)

  return (
    <>
      <Button onClick={() => openDialog('delete')} variant="danger">
        <Trash2 aria-hidden="true" className="mr-1.5 size-4" />
        動画を削除
      </Button>

      {dialog}
    </>
  )
}
