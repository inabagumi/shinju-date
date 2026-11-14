'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber, getVideoExternalUrl } from '@shinju-date/helpers'
import { formatDateTime, formatDuration } from '@shinju-date/temporal-fns'
import { Button } from '@shinju-date/ui'
import { Eye, RotateCcw, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { ActionToast, useActionToast } from '@/components/action-toast'
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
import { PlatformBadge } from './platform-badge'
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
  const { showToast, toastProps } = useActionToast()

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

    try {
      if (action === 'toggle') {
        const result = await toggleVisibilityAction(videoIds)
        if (result.success) {
          setSelectedIds([])
          showToast('success', '表示状態を更新しました。')
        } else {
          showToast('error', result.error || '更新に失敗しました。')
        }
      } else if (action === 'delete') {
        const result = await softDeleteAction(videoIds)
        if (result.success) {
          setSelectedIds([])
          showToast('success', '動画を削除しました。')
        } else {
          showToast('error', result.error || '削除に失敗しました。')
        }
      } else if (action === 'restore') {
        const result = await restoreAction(videoIds)
        if (result.success) {
          setSelectedIds([])
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
        <div className="sticky top-0 z-10 mb-4 flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold whitespace-nowrap tabular-nums">
            {selectedIds.length} 件選択中
          </span>
          <div className="flex flex-wrap gap-2">
            {hasNonDeletedVideos && (
              <>
                <Button
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => handleBulkAction('toggle')}
                  variant="secondary"
                >
                  <Eye aria-hidden="true" className="size-4" />
                  表示/非表示を切り替え
                </Button>
                <Button
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => handleBulkAction('delete')}
                  variant="danger"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  削除
                </Button>
              </>
            )}
            {hasDeletedVideos && (
              <Button
                className="gap-1.5 whitespace-nowrap"
                onClick={() => handleBulkAction('restore')}
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                復元
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Video table */}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-5xl">
          <thead className="border-b border-border bg-muted text-left text-meta whitespace-nowrap">
            <tr>
              <th className="p-3">
                <input
                  aria-label="すべて選択"
                  checked={allSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  type="checkbox"
                />
              </th>
              <th className="p-3">サムネイル</th>
              <th className="p-3">タイトル</th>
              <th className="p-3">タレント</th>
              <th className="p-3">
                <div className="flex flex-col gap-1">
                  <Link
                    className="flex items-center hover:text-accent"
                    href={getSortUrl('published_at')}
                  >
                    公開日時
                    <SortIcon
                      currentSortField={currentSortField}
                      currentSortOrder={currentSortOrder}
                      field="published_at"
                    />
                  </Link>
                  <Link
                    className="flex items-center hover:text-accent"
                    href={getSortUrl('updated_at')}
                  >
                    更新日時
                    <SortIcon
                      currentSortField={currentSortField}
                      currentSortOrder={currentSortOrder}
                      field="updated_at"
                    />
                  </Link>
                </div>
              </th>
              <th className="p-3 text-right">再生時間</th>
              <th className="p-3 text-right">クリック数</th>
              <th className="p-3">種別</th>
              <th className="p-3">ステータス</th>
              <th className="p-3">
                <span className="sr-only">アクション</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {videos.length > 0 ? (
              videos.map((video) => {
                return (
                  <tr
                    className="border-b border-border hover:bg-muted"
                    key={video.id}
                  >
                    <td className="p-3">
                      <input
                        aria-label={`「${video.title}」を選択`}
                        checked={selectedIds.includes(video.id)}
                        onChange={(e) =>
                          handleSelectVideo(video.id, e.target.checked)
                        }
                        type="checkbox"
                      />
                    </td>
                    <td className="p-3">
                      {video.thumbnail ? (
                        <div className="relative aspect-video w-28">
                          <Image
                            alt=""
                            blurDataURL={video.thumbnail.blur_data_url}
                            className="rounded-md object-cover"
                            fill
                            placeholder="blur"
                            sizes="112px"
                            src={`/images/thumbnails/${video.thumbnail.id}`}
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-video w-28 items-center justify-center rounded-md bg-muted text-caption text-muted">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="w-full min-w-64 p-3">
                      <Link
                        className="text-accent hover:underline"
                        href={`/videos/${video.id}`}
                      >
                        <div className="line-clamp-2" title={video.title}>
                          {video.title}
                        </div>
                      </Link>
                    </td>
                    <td className="p-3 text-meta whitespace-nowrap text-muted">
                      {video.talent ? video.talent.name : 'タレント不明'}
                    </td>
                    <td className="p-3 text-meta whitespace-nowrap text-muted tabular-nums">
                      <dl className="grid grid-cols-[auto_auto] gap-x-2">
                        <dt>公開</dt>
                        <dd>
                          <time dateTime={video.published_at}>
                            {formatDateTime(
                              Temporal.Instant.from(
                                video.published_at,
                              ).toZonedDateTimeISO(TIME_ZONE),
                            )}
                          </time>
                        </dd>
                        <dt>更新</dt>
                        <dd>
                          <time dateTime={video.updated_at}>
                            {formatDateTime(
                              Temporal.Instant.from(
                                video.updated_at,
                              ).toZonedDateTimeISO(TIME_ZONE),
                            )}
                          </time>
                        </dd>
                      </dl>
                    </td>
                    <td className="p-3 text-right text-meta whitespace-nowrap text-muted tabular-nums">
                      {formatDuration(Temporal.Duration.from(video.duration))}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap tabular-nums">
                      {formatNumber(video.clicks)}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col items-start gap-1">
                        <PlatformBadge platform={video.platform} />
                        <VideoKindBadge videoKind={video.video_kind} />
                      </div>
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
                              const externalUrl = getVideoExternalUrl({
                                platform: video.platform,
                                status: video.status,
                                twitchLoginName:
                                  video.twitch_video?.twitch_user
                                    ?.twitch_login_name,
                                twitchVideoId:
                                  video.twitch_video?.twitch_video_id,
                                twitchVideoType: video.twitch_video?.type,
                                youtubeVideoId:
                                  video.youtube_video?.youtube_video_id,
                              })
                              if (externalUrl) {
                                window.open(externalUrl, '_blank', 'noopener')
                              }
                            }}
                          >
                            <span className="flex items-center gap-1">
                              {video.platform === 'twitch'
                                ? 'Twitchで見る'
                                : 'YouTubeで見る'}
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
                <td className="p-8 text-center text-muted" colSpan={10}>
                  動画がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ActionToast {...toastProps} />

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
