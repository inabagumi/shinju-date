'use client'

import type { Tables } from '@shinju-date/database'
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
import { AlertTriangle, Eye, RotateCcw } from 'lucide-react'
import { useState, useTransition } from 'react'

type VideoInfo = Pick<Tables<'videos'>, 'id' | 'title'>

interface VideoActionConfirmDialogProps {
  action: 'toggle' | 'delete' | 'restore'
  videos: VideoInfo[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

const ACTION_CONFIG = {
  delete: {
    buttonVariant: 'danger' as const,
    icon: AlertTriangle,
    title: '動画を削除',
  },
  restore: {
    buttonVariant: 'primary' as const,
    icon: RotateCcw,
    title: '動画を復元',
  },
  toggle: {
    buttonVariant: 'primary' as const,
    icon: Eye,
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
  const requiresKeyword = action === 'delete'

  const handleConfirm = () => {
    // For delete operations, require keyword confirmation
    if (requiresKeyword && confirmKeyword !== 'DELETE') {
      setError('「DELETE」と入力してください。')
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

  const Icon = config.icon

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="max-h-[85vh] w-[90vw] max-w-[550px] overflow-y-auto">
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-6 w-6" />
            {config.title}
          </DialogTitle>
          <DialogDescription className="text-base">
            {getDescription()}
          </DialogDescription>

          {/* Video list */}
          <div className="my-4 max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3">
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

          {/* Keyword confirmation for delete */}
          {requiresKeyword && (
            <div className="mb-4">
              <label
                className="mb-2 block font-semibold text-red-700 text-sm"
                htmlFor="confirm-keyword"
              >
                続行するには「DELETE」と入力してください:
              </label>
              <Input
                autoComplete="off"
                disabled={isPending}
                id="confirm-keyword"
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder="DELETE"
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
              disabled={
                isPending || (requiresKeyword && confirmKeyword !== 'DELETE')
              }
              onClick={handleConfirm}
              variant={config.buttonVariant}
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
