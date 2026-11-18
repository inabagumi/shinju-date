'use client'

import type { Tables } from '@shinju-date/database'
import { Button } from '@shinju-date/ui'
import { Loader2, Trash2 } from 'lucide-react'
import { createContext, type ReactNode, use } from 'react'
import { useServerAction } from '@/lib/use-server-action'
import { syncVideoAction } from '../../_actions/sync'
import { VideoActionConfirmDialog } from '../../_components/video-action-confirm-dialog'
import { useVideoAction } from '../../_lib/use-video-action'
import type { VideoAction } from '../../_lib/video-actions'

interface SyncVideoButtonProps {
  videoId: string
  platform: Tables<'videos'>['platform']
}

function SyncVideoButton({ videoId, platform }: SyncVideoButtonProps) {
  const { isPending, run } = useServerAction(syncVideoAction, {
    errorText: '同期に失敗しました。',
    successText: ({ data }) => data?.message ?? '動画情報を同期しました。',
  })

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

interface VideoActionsProps {
  video: Pick<
    Tables<'videos'>,
    'id' | 'title' | 'visible' | 'deleted_at' | 'platform'
  >
}

/** 詳細のページの操作のボタンから、確認のダイアログを開く関数 */
const VideoActionContext = createContext<
  ((action: VideoAction) => void) | null
>(null)

function useOpenVideoActionDialog() {
  const openDialog = use(VideoActionContext)

  if (!openDialog) {
    throw new Error(
      'VideoActionsButtons と VideoDeleteButton は VideoActionsProvider の中に置いてください。',
    )
  }

  return openDialog
}

interface VideoActionsProviderProps extends VideoActionsProps {
  children: ReactNode
}

/**
 * 動画への操作（表示の切り替え・削除・復元）の確認ダイアログを1つだけ描き、
 * 中のボタンから開けるようにする。通常の操作と危険な操作を別の場所に置けるよう、
 * ボタンとは分けている。
 */
export function VideoActionsProvider({
  children,
  video,
}: VideoActionsProviderProps) {
  const { dialogProps, openDialog } = useVideoAction()

  const openVideoActionDialog = (action: VideoAction) => {
    openDialog(action, [
      { id: video.id, title: video.title, visible: video.visible },
    ])
  }

  return (
    <VideoActionContext value={openVideoActionDialog}>
      {children}
      <VideoActionConfirmDialog {...dialogProps} />
    </VideoActionContext>
  )
}

/** 見出しの右端に置く通常の操作（同期・表示の切り替え・復元） */
export function VideoActionsButtons({ video }: VideoActionsProps) {
  const openDialog = useOpenVideoActionDialog()
  const isDeleted = video.deleted_at !== null

  if (isDeleted) {
    return (
      <Button onClick={() => openDialog('restore')} variant="primary">
        復元
      </Button>
    )
  }

  return (
    <>
      <Button onClick={() => openDialog('toggle')} variant="secondary">
        {video.visible ? '非表示にする' : '表示する'}
      </Button>
      <SyncVideoButton platform={video.platform} videoId={video.id} />
    </>
  )
}

/** ページの末尾に、通常の操作と離して置く削除のボタン */
export function VideoDeleteButton() {
  const openDialog = useOpenVideoActionDialog()

  return (
    <Button onClick={() => openDialog('delete')} variant="danger">
      <Trash2 aria-hidden="true" className="mr-1.5 size-4" />
      動画を削除
    </Button>
  )
}
