'use client'

import { formatNumber } from '@shinju-date/helpers'
import { formatDuration } from '@shinju-date/temporal-fns'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { twMerge } from 'tailwind-merge'
import { Temporal } from 'temporal-polyfill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import { supabaseClient } from '@/lib/supabase/public'
import {
  softDeleteAction,
  softDeleteSingleVideoAction,
  toggleSingleVideoVisibilityAction,
  toggleVisibilityAction,
} from '../_actions'
import type { Video } from '../_lib/get-videos'
import { SortIcon } from './sort-icon'

type Props = {
  videos: Video[]
}

function getStatusText(video: Video): string {
  if (video.deleted_at) return '削除済み'
  if (video.visible) return '公開中'
  return '非表示'
}

export default function VideoList({ videos }: Props) {
  const searchParams = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'toggle' | 'delete'
    open: boolean
    id?: string
  }>({ action: 'toggle', open: false })
  const [isPending, startTransition] = useTransition()

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(videos.map((v) => v.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectVideo = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleBulkAction = (action: 'toggle' | 'delete') => {
    setShowConfirmModal({ action, open: true })
  }

  const handleSingleAction = (action: 'toggle' | 'delete', id: string) => {
    setShowConfirmModal({ action, id, open: true })
  }

  const handleConfirm = () => {
    startTransition(async () => {
      try {
        // If id is provided, it's a single action
        if (showConfirmModal.id) {
          if (showConfirmModal.action === 'toggle') {
            const result = await toggleSingleVideoVisibilityAction(
              showConfirmModal.id,
            )
            if (result.success) {
              alert('表示状態を更新しました。')
            } else {
              alert(result.error || '更新に失敗しました。')
            }
          } else if (showConfirmModal.action === 'delete') {
            const result = await softDeleteSingleVideoAction(
              showConfirmModal.id,
            )
            if (result.success) {
              alert('動画を削除しました。')
            } else {
              alert(result.error || '削除に失敗しました。')
            }
          }
        } else {
          // Bulk action
          if (showConfirmModal.action === 'toggle') {
            const result = await toggleVisibilityAction(selectedIds)
            if (result.success) {
              setSelectedIds([])
              alert('表示状態を更新しました。')
            } else {
              alert(result.error || '更新に失敗しました。')
            }
          } else if (showConfirmModal.action === 'delete') {
            const result = await softDeleteAction(selectedIds)
            if (result.success) {
              setSelectedIds([])
              alert('動画を削除しました。')
            } else {
              alert(result.error || '削除に失敗しました。')
            }
          }
        }
      } catch (_error) {
        alert('エラーが発生しました。')
      } finally {
        setShowConfirmModal({ action: 'toggle', open: false })
      }
    })
  }

  const getSortUrl = (field: 'published_at' | 'updated_at') => {
    const params = new URLSearchParams(searchParams.toString())
    // Toggle sort order if clicking the same field, otherwise default to desc
    if (currentSortField === field) {
      params.set('sortOrder', currentSortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sortField', field)
      params.set('sortOrder', 'desc')
    }
    // Reset to page 1 when sort changes
    params.delete('page')
    return `/videos?${params.toString()}`
  }

  const allSelected = videos.length > 0 && selectedIds.length === videos.length

  const currentSortField = searchParams.get('sortField') || 'updated_at'
  const currentSortOrder = (searchParams.get('sortOrder') || 'desc') as
    | 'asc'
    | 'desc'

  return (
    <div>
      {/* Action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 mb-4 bg-blue-600 p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{selectedIds.length} 件選択中</span>
            <div className="flex gap-2">
              <button
                className="rounded-md bg-blue-700 px-4 py-2 hover:bg-blue-800 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleBulkAction('toggle')}
                type="button"
              >
                表示/非表示を切り替え
              </button>
              <button
                className="rounded-md bg-red-600 px-4 py-2 hover:bg-red-700 disabled:bg-gray-400"
                disabled={isPending}
                onClick={() => handleBulkAction('delete')}
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
              <th className="whitespace-nowrap p-3 text-left">サムネイル</th>
              <th className="whitespace-nowrap p-3 text-left">タイトル</th>
              <th className="whitespace-nowrap p-3 text-left">チャンネル</th>
              <th className="whitespace-nowrap p-3 text-left">
                <Link
                  className="flex items-center hover:text-blue-600"
                  href={getSortUrl('published_at')}
                >
                  公開日時
                  <SortIcon
                    currentSortField={currentSortField}
                    currentSortOrder={currentSortOrder}
                    field="published_at"
                  />
                </Link>
              </th>
              <th className="whitespace-nowrap p-3 text-left">
                <Link
                  className="flex items-center hover:text-blue-600"
                  href={getSortUrl('updated_at')}
                >
                  更新日時
                  <SortIcon
                    currentSortField={currentSortField}
                    currentSortOrder={currentSortOrder}
                    field="updated_at"
                  />
                </Link>
              </th>
              <th className="whitespace-nowrap p-3 text-left">再生時間</th>
              <th className="whitespace-nowrap p-3 text-left">クリック数</th>
              <th className="whitespace-nowrap p-3 text-left">ステータス</th>
              <th className="whitespace-nowrap p-3 text-left">アクション</th>
            </tr>
          </thead>
          <tbody>
            {videos.length > 0 ? (
              videos.map((video) => (
                <tr className="border-b hover:bg-gray-50" key={video.id}>
                  <td className="p-3">
                    <input
                      checked={selectedIds.includes(video.id)}
                      onChange={(e) =>
                        handleSelectVideo(video.id, e.target.checked)
                      }
                      type="checkbox"
                    />
                  </td>
                  <td className="p-3">
                    {video.thumbnail ? (
                      <div className="relative aspect-video w-20 md:w-28">
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="(max-width: 768px) 80px, 112px"
                          src={
                            supabaseClient.storage
                              .from('thumbnails')
                              .getPublicUrl(video.thumbnail.path).data.publicUrl
                          }
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video w-20 items-center justify-center bg-gray-200 text-xs md:w-28">
                        No Image
                      </div>
                    )}
                  </td>
                  <td className="max-w-xs p-3">
                    <Link
                      className="text-blue-600 hover:text-blue-800"
                      href={`/videos/${video.id}`}
                    >
                      <div className="line-clamp-2" title={video.title}>
                        {video.title}
                      </div>
                    </Link>
                  </td>
                  <td className="p-3">
                    <span className="text-gray-600 text-sm">
                      {video.channel.name}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-gray-600 text-sm">
                      {new Date(video.published_at).toLocaleDateString(
                        'ja-JP',
                        {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-gray-600 text-sm">
                      {new Date(video.updated_at).toLocaleDateString('ja-JP', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-gray-600 text-sm">
                      {formatDuration(Temporal.Duration.from(video.duration))}
                    </span>
                  </td>
                  <td className="p-3">{formatNumber(video.clicks)}</td>
                  <td className="p-3">
                    <span
                      className={twMerge(
                        'whitespace-nowrap rounded px-2 py-1 text-xs',
                        video.deleted_at
                          ? 'bg-red-100 text-red-800'
                          : video.visible
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800',
                      )}
                    >
                      {getStatusText(video)}
                    </span>
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="アクションメニュー">
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <title>アクションメニュー</title>
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => {
                            if (video.youtube_video?.youtube_video_id) {
                              window.open(
                                `https://www.youtube.com/watch?v=${video.youtube_video.youtube_video_id}`,
                                '_blank',
                              )
                            }
                          }}
                        >
                          <span className="flex items-center gap-1">
                            YouTubeで見る
                            <svg
                              aria-hidden="true"
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              viewBox="0 0 24 24"
                            >
                              <title>外部リンク</title>
                              <path
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSingleAction('toggle', video.id)}
                        >
                          表示/非表示を切り替え
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleSingleAction('delete', video.id)}
                          variant="danger"
                        >
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={10}>
                  動画がありません。
                </td>
              </tr>
            )}
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
                ? showConfirmModal.id
                  ? 'この動画を削除しますか？'
                  : `本当に${selectedIds.length}件の動画を削除しますか？`
                : showConfirmModal.id
                  ? 'この動画の表示状態を切り替えますか？'
                  : `本当に${selectedIds.length}件の動画の表示状態を切り替えますか？`}
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
