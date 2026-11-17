'use client'

import type { Tables } from '@shinju-date/database'
import type { ButtonProps } from '@shinju-date/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'

type VideoInfo = Pick<Tables<'videos'>, 'id' | 'title'>

/** 動画に対する操作の種類 */
type VideoAction = 'toggle' | 'delete' | 'restore'

interface VideoActionConfirmDialogProps {
  action: VideoAction
  videos: VideoInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

interface VideoActionConfig {
  title: string
  description: (count: number) => string
  confirmLabel: string
  confirmVariant: ButtonProps['variant']
  /** 指定すると、この文字列を入力するまで実行できない */
  requireKeyword?: string
}

const VIDEO_ACTIONS = {
  delete: {
    confirmLabel: '削除する',
    confirmVariant: 'danger',
    description: (count) =>
      count > 1
        ? `${count}件の動画を削除しようとしています。この操作は取り消せません。`
        : '以下の動画を削除します。この操作は取り消せません。',
    requireKeyword: 'DELETE',
    title: '動画を削除',
  },
  restore: {
    confirmLabel: '復元する',
    confirmVariant: 'primary',
    description: (count) =>
      count > 1 ? `${count}件の動画を復元します。` : '以下の動画を復元します。',
    title: '動画を復元',
  },
  toggle: {
    confirmLabel: '切り替える',
    confirmVariant: 'primary',
    description: (count) =>
      count > 1
        ? `${count}件の動画の表示状態を切り替えます。`
        : '以下の動画の表示状態を切り替えます。',
    title: '表示状態を切り替え',
  },
} as const satisfies Record<VideoAction, VideoActionConfig>

/**
 * 動画の表示の切り替え・削除・復元を確かめてから実行するダイアログ。
 * 実行中の表示、エラーの表示、削除のときのキーワードの入力は `ConfirmDialog` が
 * 受け持つ。
 */
export function VideoActionConfirmDialog({
  action,
  videos,
  open,
  onOpenChange,
  onConfirm,
}: VideoActionConfirmDialogProps) {
  const config: VideoActionConfig = VIDEO_ACTIONS[action]

  return (
    <ConfirmDialog
      confirmLabel={config.confirmLabel}
      confirmVariant={config.confirmVariant}
      description={config.description(videos.length)}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      pendingLabel="処理中..."
      requireKeyword={config.requireKeyword}
      size="lg"
      title={config.title}
    >
      <p className="mb-2 font-semibold tabular-nums">
        対象動画 ({videos.length}件):
      </p>
      <ul className="max-h-60 space-y-2 overflow-y-auto">
        {videos.map((video) => (
          <li
            className="border-l-2 border-border pl-2 text-muted"
            key={video.id}
          >
            {video.title}
          </li>
        ))}
      </ul>
    </ConfirmDialog>
  )
}
