'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber } from '@shinju-date/helpers'
import { formatDateTime, formatDuration } from '@shinju-date/temporal-fns'
import {
  Button,
  EmptyState,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import {
  EllipsisVertical,
  ExternalLink,
  Eye,
  RotateCcw,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useActionToast } from '@/components/action-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/dropdown-menu'
import {
  ExternalVideoLink,
  getExternalVideoUrl,
} from '@/components/external-video-link'
import { VideoThumbnail } from '@/components/video-thumbnail'
import { useSearchParamsHref } from '@/lib/use-update-search-params'
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

type VideoAction = 'toggle' | 'delete' | 'restore'

interface ConfirmDialogState {
  action: VideoAction
  open: boolean
  videos: Pick<Video, 'id' | 'title'>[]
}

/**
 * 操作の対象になる動画を求める。削除は未削除の動画だけ、復元は削除済みの動画
 * だけを対象にする。確認ダイアログの表示とアクションの実行で同じ結果を使う
 */
function getTargetVideos(
  videos: Video[],
  action: VideoAction,
  ids: readonly string[],
): Pick<Video, 'id' | 'title'>[] {
  const idSet = new Set(ids)

  return videos
    .filter((v) => {
      if (!idSet.has(v.id)) {
        return false
      }
      if (action === 'delete') {
        return v.deleted_at === null
      }
      if (action === 'restore') {
        return v.deleted_at !== null
      }
      return true
    })
    .map((v) => ({ id: v.id, title: v.title }))
}

export default function VideoList({ videos }: Props) {
  const searchParams = useSearchParams()
  const createSortHref = useSearchParamsHref()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [prevVideos, setPrevVideos] = useState(videos)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    action: 'toggle',
    open: false,
    videos: [],
  })
  const { showToast } = useActionToast()

  // ページ送り・絞り込み・並べ替えで一覧が変わったら、選択を現在の一覧に
  // 含まれる動画だけに絞る（ページをまたぐ選択は持たない）
  if (videos !== prevVideos) {
    setPrevVideos(videos)
    const currentIds = new Set(videos.map((v) => v.id))
    setSelectedIds((prev) => prev.filter((id) => currentIds.has(id)))
  }

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

  const handleBulkAction = (action: VideoAction) => {
    setConfirmDialog({
      action,
      open: true,
      videos: getTargetVideos(videos, action, selectedIds),
    })
  }

  const handleSingleAction = (action: VideoAction, id: string) => {
    setConfirmDialog({
      action,
      open: true,
      videos: getTargetVideos(videos, action, [id]),
    })
  }

  const handleConfirm = async () => {
    const { action } = confirmDialog
    // 確認ダイアログに表示した動画だけを更新する
    const videoIds = confirmDialog.videos.map((v) => v.id)

    if (videoIds.length === 0) {
      throw new Error('動画が選択されていません。')
    }

    try {
      if (action === 'toggle') {
        const result = await toggleVisibilityAction(videoIds)
        if (result.success) {
          setSelectedIds([])
          showToast(
            'success',
            `${result.updatedCount ?? videoIds.length} 件の動画の表示状態を更新しました。`,
          )
        } else {
          showToast('danger', result.error || '更新に失敗しました。')
        }
      } else if (action === 'delete') {
        const result = await softDeleteAction(videoIds)
        if (result.success) {
          setSelectedIds([])
          showToast('success', '動画を削除しました。')
        } else {
          showToast('danger', result.error || '削除に失敗しました。')
        }
      } else if (action === 'restore') {
        const result = await restoreAction(videoIds)
        if (result.success) {
          setSelectedIds([])
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

  // Toggle sort order if clicking the same field, otherwise default to desc.
  // `page` is removed so that the list starts from page 1.
  const getSortUrl = (field: 'published_at' | 'updated_at') =>
    currentSortField === field
      ? createSortHref({
          sortOrder: currentSortOrder === 'asc' ? 'desc' : 'asc',
        })
      : createSortHref({ sortField: field, sortOrder: 'desc' })

  const allSelected =
    videos.length > 0 && videos.every((v) => selectedIds.includes(v.id))

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
      {/*
       * 一括操作のバー。選択の有無で表が上下に動かないよう、常に同じ高さで
       * 表の上に確保する。狭い画面ではボタンの文字を隠してアイコンだけにする
       */}
      <div
        aria-label="選択した動画の操作"
        className="mb-4 flex h-14 items-center justify-between gap-3 rounded-container bg-muted px-4"
        role="toolbar"
      >
        {selectedIds.length > 0 ? (
          <>
            <span
              aria-live="polite"
              className="text-meta font-semibold whitespace-nowrap tabular-nums"
            >
              {selectedIds.length} 件選択中
            </span>
            <div className="flex gap-2">
              {hasNonDeletedVideos && (
                <Button
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => handleBulkAction('toggle')}
                  size="sm"
                  variant="secondary"
                >
                  <Eye aria-hidden="true" className="size-4" />
                  <span className="sr-only sm:not-sr-only">
                    表示/非表示を切り替え
                  </span>
                </Button>
              )}
              {hasDeletedVideos && (
                <Button
                  className="gap-1.5 whitespace-nowrap"
                  onClick={() => handleBulkAction('restore')}
                  size="sm"
                  variant="secondary"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  <span className="sr-only sm:not-sr-only">復元</span>
                </Button>
              )}
              {hasNonDeletedVideos && (
                <Button
                  className="ml-2 gap-1.5 whitespace-nowrap sm:ml-4"
                  onClick={() => handleBulkAction('delete')}
                  size="sm"
                  variant="danger"
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  <span className="sr-only sm:not-sr-only">削除</span>
                </Button>
              )}
            </div>
          </>
        ) : (
          <span className="text-meta text-muted">
            動画を選択すると、まとめて操作できます。
          </span>
        )}
      </div>

      {/* Video table */}
      <Table className="min-w-5xl">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>
              <input
                aria-label="すべて選択"
                checked={allSelected}
                className="size-4 accent-accent"
                onChange={(e) => handleSelectAll(e.target.checked)}
                type="checkbox"
              />
            </TableHead>
            <TableHead>サムネイル</TableHead>
            <TableHead>タイトル</TableHead>
            <TableHead>タレント</TableHead>
            <TableHead>
              <div className="flex flex-col gap-1">
                <Link
                  className="flex items-center rounded-control hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
                  className="flex items-center rounded-control hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
            </TableHead>
            <TableHead className="text-right">再生時間</TableHead>
            <TableHead className="text-right">クリック数</TableHead>
            <TableHead>種別</TableHead>
            <TableHead>ステータス</TableHead>
            <TableHead>
              <span className="sr-only">アクション</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {videos.length > 0 ? (
            videos.map((video) => {
              return (
                <TableRow key={video.id}>
                  <TableCell>
                    <input
                      aria-label={`「${video.title}」を選択`}
                      checked={selectedIds.includes(video.id)}
                      className="size-4 accent-accent"
                      onChange={(e) =>
                        handleSelectVideo(video.id, e.target.checked)
                      }
                      type="checkbox"
                    />
                  </TableCell>
                  <TableCell>
                    <VideoThumbnail size="md" thumbnail={video.thumbnail} />
                  </TableCell>
                  <TableCell className="w-full min-w-64 whitespace-normal">
                    <Link
                      className="text-accent hover:underline"
                      href={`/videos/${video.id}`}
                    >
                      <div className="line-clamp-2" title={video.title}>
                        {video.title}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted">
                    {video.talent ? video.talent.name : 'タレント不明'}
                  </TableCell>
                  <TableCell className="text-muted tabular-nums">
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
                  </TableCell>
                  <TableCell className="text-right text-muted tabular-nums">
                    {formatDuration(Temporal.Duration.from(video.duration))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(video.clicks)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <PlatformBadge platform={video.platform} />
                      <VideoKindBadge videoKind={video.video_kind} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <VideoStatusBadge video={video} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger aria-label="アクションメニュー">
                        <EllipsisVertical
                          aria-hidden="true"
                          className="size-5"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {getExternalVideoUrl(video) && (
                          <DropdownMenuItem asChild>
                            <ExternalVideoLink video={video}>
                              {video.platform === 'twitch'
                                ? 'Twitchで見る'
                                : 'YouTubeで見る'}
                              <ExternalLink
                                aria-hidden="true"
                                className="size-4 text-muted"
                              />
                            </ExternalVideoLink>
                          </DropdownMenuItem>
                        )}
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
                            <div className="my-1 border-t border-border" />
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
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell className="whitespace-normal" colSpan={10}>
                <EmptyState icon={<VideoIcon />} title="動画がありません。" />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Confirmation modal */}
      <VideoActionConfirmDialog
        action={confirmDialog.action}
        onConfirm={handleConfirm}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        open={confirmDialog.open}
        videos={confirmDialog.videos}
      />
    </div>
  )
}
