'use client'

import { createContext, type ReactNode, use, useState } from 'react'
import { useVideoAction } from '../_lib/use-video-action'
import type { VideoAction, VideoActionTarget } from '../_lib/video-actions'
import { VideoActionConfirmDialog } from './video-action-confirm-dialog'

interface VideoSelectionContextValue {
  /** 表示中の動画の ID */
  videoIds: readonly string[]
  /** 選択中の動画の ID */
  selectedIds: readonly string[]
  /** 1件の動画の選択を切り替える */
  setSelected: (id: string, selected: boolean) => void
  /** 表示中の動画を、すべて選択するか、すべて外す */
  setAllSelected: (selected: boolean) => void
  /** 操作と対象の動画を指定して、確認のダイアログを開く */
  openActionDialog: (
    action: VideoAction,
    targets: readonly VideoActionTarget[],
  ) => void
}

const VideoSelectionContext = createContext<VideoSelectionContextValue | null>(
  null,
)

/** `VideoSelectionProvider` の中で、選択と操作のダイアログを使う */
export function useVideoSelection(): VideoSelectionContextValue {
  const value = use(VideoSelectionContext)

  if (!value) {
    throw new Error(
      '動画の選択と操作の部品は VideoSelectionProvider の中に置いてください。',
    )
  }

  return value
}

interface VideoSelectionProviderProps {
  children: ReactNode
  /** 表示中の動画の ID。並び順は問わない */
  videoIds: readonly string[]
}

/**
 * 動画の一覧の、選択中の ID と、操作（表示の切り替え・削除・復元）の確認ダイアログ
 * を持つ。ダイアログは1つだけ描き、一括操作と行ごとの操作の両方から開く。
 * 操作が成功したら、選択を外す
 */
export function VideoSelectionProvider({
  children,
  videoIds,
}: VideoSelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
  const [prevVideoIds, setPrevVideoIds] = useState(videoIds)
  const { dialogProps, openDialog } = useVideoAction({
    onSuccess: () => setSelectedIds([]),
  })

  // ページ送り・絞り込み・並べ替えで一覧が変わったら、選択を現在の一覧に
  // 含まれる動画だけに絞る（ページをまたぐ選択は持たない）
  if (videoIds !== prevVideoIds) {
    setPrevVideoIds(videoIds)
    const currentIds = new Set(videoIds)
    setSelectedIds((prev) => prev.filter((id) => currentIds.has(id)))
  }

  const setSelected = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const others = prev.filter((selectedId) => selectedId !== id)

      return selected ? [...others, id] : others
    })
  }

  const setAllSelected = (selected: boolean) => {
    setSelectedIds(selected ? videoIds : [])
  }

  return (
    <VideoSelectionContext
      value={{
        openActionDialog: openDialog,
        selectedIds,
        setAllSelected,
        setSelected,
        videoIds,
      }}
    >
      {children}
      <VideoActionConfirmDialog {...dialogProps} />
    </VideoSelectionContext>
  )
}
