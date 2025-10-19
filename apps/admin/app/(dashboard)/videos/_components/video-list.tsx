'use client'

import { useState, useTransition } from 'react'
import type { Video } from '../_lib/get-videos'
import { softDeleteAction, toggleVisibilityAction } from '../actions'

type Props = {
  videos: Video[]
}

export default function VideoList({ videos }: Props) {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'toggle' | 'delete'
    open: boolean
  }>({ action: 'toggle', open: false })
  const [isPending, startTransition] = useTransition()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSlugs(videos.map((v) => v.slug))
    } else {
      setSelectedSlugs([])
    }
  }

  const handleSelectVideo = (slug: string, checked: boolean) => {
    if (checked) {
      setSelectedSlugs((prev) => [...prev, slug])
    } else {
      setSelectedSlugs((prev) => prev.filter((s) => s !== slug))
    }
  }

  const handleAction = (action: 'toggle' | 'delete') => {
    setShowConfirmModal({ action, open: true })
  }

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        if (showConfirmModal.action === 'toggle') {
          const result = await toggleVisibilityAction(selectedSlugs)
          if (result.success) {
            setSelectedSlugs([])
            alert('表示状態を更新しました。')
          } else {
            alert(result.error || '更新に失敗しました。')
          }
        } else if (showConfirmModal.action === 'delete') {
          const result = await softDeleteAction(selectedSlugs)
          if (result.success) {
            setSelectedSlugs([])
            alert('動画を削除しました。')
          } else {
            alert(result.error || '削除に失敗しました。')
          }
        }
      } catch (_error) {
        alert('エラーが発生しました。')
      } finally {
        setShowConfirmModal({ action: 'toggle', open: false })
      }
    })
  }

  const allSelected =
    videos.length > 0 && selectedSlugs.length === videos.length

  return (
    <div>
      {/* Action bar */}
      {selectedSlugs.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-600 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">
              {selectedSlugs.length} 件選択中
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-blue-700 px-4 py-2 hover:bg-blue-800 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleAction('toggle')}
                type="button"
              >
                表示/非表示を切り替え
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 hover:bg-red-700 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleAction('delete')}
                type="button"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">
                <input
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  type="checkbox"
                />
              </th>
              <th className="p-3 text-left">サムネイル</th>
              <th className="p-3 text-left">タイトル</th>
              <th className="p-3 text-left">クリック数</th>
              <th className="p-3 text-left">表示状態</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr className="border-b hover:bg-gray-50" key={video.slug}>
                <td className="p-3">
                  <input
                    checked={selectedSlugs.includes(video.slug)}
                    onChange={(e) =>
                      handleSelectVideo(video.slug, e.target.checked)
                    }
                    type="checkbox"
                  />
                </td>
                <td className="p-3">
                  {video.thumbnail ? (
                    // biome-ignore lint/performance/noImgElement: Admin UI does not need image optimization
                    <img
                      alt=""
                      className="h-16 w-28 object-cover"
                      src={`https://img.shinju.date/${video.thumbnail.path}`}
                    />
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center bg-gray-200">
                      No Image
                    </div>
                  )}
                </td>
                <td className="p-3">{video.title}</td>
                <td className="p-3">{video.clicks}</td>
                <td className="p-3">
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      video.visible
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {video.visible ? '表示' : '非表示'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation modal */}
      {showConfirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-semibold text-lg">確認</h3>
            <p className="mb-6 text-gray-700">
              {showConfirmModal.action === 'delete'
                ? `本当に${selectedSlugs.length}件の動画を削除しますか？`
                : `本当に${selectedSlugs.length}件の動画の表示状態を切り替えますか？`}
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-100"
                disabled={isPending}
                onClick={() =>
                  setShowConfirmModal({ action: 'toggle', open: false })
                }
                type="button"
              >
                キャンセル
              </button>
              <button
                className={`rounded-md px-4 py-2 text-white disabled:bg-gray-400 ${
                  showConfirmModal.action === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isPending}
                onClick={handleConfirm}
                type="button"
              >
                {isPending ? '処理中...' : '実行'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
