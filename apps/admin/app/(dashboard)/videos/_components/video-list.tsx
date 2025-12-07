'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber } from '@shinju-date/helpers'
import { formatDateTime, formatDuration } from '@shinju-date/temporal-fns'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Temporal } from 'temporal-polyfill'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../_actions'
import type { Video } from '../_lib/get-videos'
import { SortIcon } from './sort-icon'
import { VideoActionConfirmDialog } from './video-action-confirm-dialog'
import { VideoKindBadge } from './video-kind-badge'
import { VideoStatusBadge } from './video-status-badge'

interface Props {
  videos: Video[]
}

export default function VideoList({ videos }: Props) {
  const searchParams = useSearchParams()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    action: 'toggle' | 'delete' | 'restore'
    open: boolean
    videoIds: string[]
  }>({ action: 'toggle', open: false, videoIds: [] })

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

  const handleBulkAction = (action: 'toggle' | 'delete' | 'restore') => {
    setConfirmDialog({ action, open: true, videoIds: selectedIds })
  }

  const handleSingleAction = (
    action: 'toggle' | 'delete' | 'restore',
    id: string,
  ) => {
    setConfirmDialog({ action, open: true, videoIds: [id] })
  }

  const handleConfirm = async () => {
    const { action, videoIds } = confirmDialog

    if (videoIds.length === 0) {
      throw new Error('動画が選択されていません。')
    }

    if (action === 'toggle') {
      const result = await toggleVisibilityAction(videoIds)
      if (result.success) {
        setSelectedIds([])
        alert('表示状態を更新しました。')
      } else {
        throw new Error(result.error || '更新に失敗しました。')
      }
    } else if (action === 'delete') {
      const result = await softDeleteAction(videoIds)
      if (result.success) {
        setSelectedIds([])
        alert('動画を削除しました。')
      } else {
        throw new Error(result.error || '削除に失敗しました。')
      }
    } else if (action === 'restore') {
      const result = await restoreAction(videoIds)
      if (result.success) {
        setSelectedIds([])
        alert('動画を復元しました。')
      } else {
        throw new Error(result.error || '復元に失敗しました。')
      }
    }
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

  // Check if selected videos are deleted
  const selectedVideos = useMemo(
    () => videos.filter((v) => selectedIds.includes(v.id)),
    [videos, selectedIds],
  )
  const hasDeletedVideos = selectedVideos.some((v) => v.deleted_at !== null)
  const hasNonDeletedVideos = selectedVideos.some((v) => v.deleted_at === null)

  return (
    <div>
      {/* Action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 mb-4 bg-secondary-blue p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{selectedIds.length} 件選択中</span>
            <div className="flex gap-2">
              {hasNonDeletedVideos && (
                <>
                  <button
                    className="rounded-md bg-774-blue-800 px-4 py-2 hover:bg-774-blue-900"
                    onClick={() => handleBulkAction('toggle')}
                    type="button"
                  >
                    表示/非表示を切り替え
                  </button>
                  <button
                    className="rounded-md bg-red-600 px-4 py-2 hover:bg-red-700"
                    onClick={() => handleBulkAction('delete')}
                    type="button"
                  >
                    削除
                  </button>
                </>
              )}
              {hasDeletedVideos && (
                <button
                  className="rounded-md bg-green-600 px-4 py-2 hover:bg-green-700"
                  onClick={() => handleBulkAction('restore')}
                  type="button"
                >
                  復元
                </button>
              )}
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
              <th className="whitespace-nowrap p-3 text-left">タレント</th>
              <th className="whitespace-nowrap p-3 text-left">
                <Link
                  className="flex items-center hover:text-774-blue-600"
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
                  className="flex items-center hover:text-774-blue-600"
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
              <th className="whitespace-nowrap p-3 text-left">動画種別</th>
              <th className="whitespace-nowrap p-3 text-left">ステータス</th>
              <th className="whitespace-nowrap p-3 text-left">アクション</th>
            </tr>
          </thead>
          <tbody>
            {videos.length > 0 ? (
              videos.map((video) => {
                return (
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
                            blurDataURL={video.thumbnail.blur_data_url}
                            className="object-cover"
                            fill
                            placeholder="blur"
                            sizes="(max-width: 768px) 80px, 112px"
                            src={`/images/thumbnails/${video.thumbnail.id}`}
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
                        className="text-774-blue-600 hover:text-774-blue-800"
                        href={`/videos/${video.id}`}
                      >
                        <div className="line-clamp-2" title={video.title}>
                          {video.title}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-600 text-sm">
                        {video.talent.name}
                      </span>
                    </td>
                    <td className="p-3">
                      <time
                        className="text-gray-600 text-sm"
                        dateTime={video.published_at}
                      >
                        {formatDateTime(
                          Temporal.Instant.from(
                            video.published_at,
                          ).toZonedDateTimeISO(TIME_ZONE),
                        )}
                      </time>
                    </td>
                    <td className="p-3">
                      <time
                        className="text-gray-600 text-sm"
                        dateTime={video.updated_at}
                      >
                        {formatDateTime(
                          Temporal.Instant.from(
                            video.updated_at,
                          ).toZonedDateTimeISO(TIME_ZONE),
                        )}
                      </time>
                    </td>
                    <td className="p-3">
                      <span className="text-gray-600 text-sm">
                        {formatDuration(Temporal.Duration.from(video.duration))}
                      </span>
                    </td>
                    <td className="p-3">{formatNumber(video.clicks)}</td>
                    <td className="p-3">
                      <VideoKindBadge videoKind={video.video_kind} />
                    </td>
                    <td className="p-3">
                      <VideoStatusBadge video={video} />
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
                          {video.deleted_at ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleSingleAction('restore', video.id)
                              }
                            >
                              復元
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSingleAction('toggle', video.id)
                                }
                              >
                                表示/非表示を切り替え
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleSingleAction('delete', video.id)
                                }
                                variant="danger"
                              >
                                削除
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td className="p-8 text-center text-gray-500" colSpan={11}>
                  動画がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation modal */}
      <VideoActionConfirmDialog
        action={confirmDialog.action}
        onConfirm={handleConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        videos={videos
          .filter((v) => {
            // Filter videos based on action
            if (confirmDialog.action === 'delete') {
              // Only show non-deleted videos for delete action
              return (
                confirmDialog.videoIds.includes(v.id) && v.deleted_at === null
              )
            }
            if (confirmDialog.action === 'restore') {
              // Only show deleted videos for restore action
              return (
                confirmDialog.videoIds.includes(v.id) && v.deleted_at !== null
              )
            }
            // For toggle, show all selected videos
            return confirmDialog.videoIds.includes(v.id)
          })
          .map((v) => ({ id: v.id, title: v.title }))}
      />
    </div>
  )
}
