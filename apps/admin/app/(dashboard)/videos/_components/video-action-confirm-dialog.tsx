'use client'

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  Input,
} from '@shinju-date/ui'
import { useState, useTransition } from 'react'

interface VideoInfo {
  id: string
  title: string
}

interface VideoActionConfirmDialogProps {
  action: 'toggle' | 'delete' | 'restore'
  videos: VideoInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

const ACTION_CONFIG = {
  delete: {
    color: 'red',
    confirmButton: 'bg-red-600 hover:bg-red-700',
    icon: '⚠️',
    requiresKeyword: true,
    title: '動画を削除',
  },
  restore: {
    color: 'green',
    confirmButton: 'bg-green-600 hover:bg-green-700',
    icon: '🔄',
    requiresKeyword: false,
    title: '動画を復元',
  },
  toggle: {
    color: 'blue',
    confirmButton: 'bg-blue-600 hover:bg-blue-700',
    icon: '👁️',
    requiresKeyword: false,
    title: '表示状態を切り替え',
  },
} as const

export function VideoActionConfirmDialog({
  action,
  videos,
  open,
  onOpenChange,
  onConfirm,
}: VideoActionConfirmDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmKeyword, setConfirmKeyword] = useState('')

  const config = ACTION_CONFIG[action]
  const isMultiple = videos.length > 1
  const isBulkDelete = action === 'delete' && videos.length >= 3

  const handleConfirm = () => {
    // For bulk delete operations with 3+ videos, require keyword confirmation
    if (isBulkDelete && confirmKeyword !== '削除') {
      setError('「削除」と入力してください。')
      return
    }

    startTransition(async () => {
      try {
        await onConfirm()
        setError(null)
        setConfirmKeyword('')
        onOpenChange(false)
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : '予期しないエラーが発生しました。',
        )
      }
    })
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!isPending) {
      setError(null)
      setConfirmKeyword('')
      onOpenChange(newOpen)
    }
  }

  const getDescription = () => {
    if (action === 'delete') {
      if (isMultiple) {
        return `${videos.length}件の動画を削除しようとしています。この操作は取り消せません。`
      }
      return '以下の動画を削除します。この操作は取り消せません。'
    }
    if (action === 'restore') {
      if (isMultiple) {
        return `${videos.length}件の動画を復元します。`
      }
      return '以下の動画を復元します。'
    }
    if (isMultiple) {
      return `${videos.length}件の動画の表示状態を切り替えます。`
    }
    return '以下の動画の表示状態を切り替えます。'
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[85vh] w-[90vw] max-w-[550px] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {getDescription()}
          </DialogDescription>

          {/* Video list */}
          <div
            className={`my-4 max-h-60 overflow-y-auto rounded-md border p-3 ${
              action === 'delete'
                ? 'border-red-200 bg-red-50'
                : action === 'restore'
                  ? 'border-green-200 bg-green-50'
                  : 'border-blue-200 bg-blue-50'
            }`}
          >
            <div className="mb-2 font-semibold text-gray-700 text-sm">
              対象動画 ({videos.length}件):
            </div>
            <ul className="space-y-2">
              {videos.map((video) => (
                <li
                  className="border-gray-400 border-l-2 pl-2 text-gray-600 text-sm"
                  key={video.id}
                >
                  {video.title}
                </li>
              ))}
            </ul>
          </div>

          {/* Keyword confirmation for bulk delete */}
          {isBulkDelete && (
            <div className="mb-4">
              <label
                className="mb-2 block font-semibold text-red-700 text-sm"
                htmlFor="confirm-keyword"
              >
                続行するには「削除」と入力してください:
              </label>
              <Input
                autoComplete="off"
                disabled={isPending}
                id="confirm-keyword"
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="削除"
                value={confirmKeyword}
              />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button disabled={isPending} variant="secondary">
                キャンセル
              </Button>
            </DialogClose>
            <Button
              className={config.confirmButton}
              disabled={
                isPending || (isBulkDelete && confirmKeyword !== '削除')
              }
              onClick={handleConfirm}
              variant="primary"
            >
              {isPending
                ? '処理中...'
                : action === 'delete'
                  ? '削除する'
                  : action === 'restore'
                    ? '復元する'
                    : '切り替える'}
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  )
}
