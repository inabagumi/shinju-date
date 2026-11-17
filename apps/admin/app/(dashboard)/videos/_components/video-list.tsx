import { formatNumber } from '@shinju-date/helpers'
import { formatDuration } from '@shinju-date/temporal-fns'
import {
  EmptyState,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@shinju-date/ui'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Video as VideoIcon,
} from 'lucide-react'
import Link from 'next/link'
import { getExternalVideoUrl } from '@/components/external-video-link'
import { PlatformBadge } from '@/components/platform-badge'
import {
  TableSkeleton,
  type TableSkeletonColumn,
} from '@/components/table-skeleton'
import { VideoStatusBadge } from '@/components/video-status-badge'
import { VideoThumbnail } from '@/components/video-thumbnail'
import { formatDateTimeFromISO } from '@/lib/format'
import type { Video, VideoSortField } from '../_lib/get-videos'
import {
  getVideoSortHref,
  toAriaSort,
  type VideoSort,
} from '../_lib/video-sort'
import { VideoBulkActions } from './video-bulk-actions'
import { VideoKindBadge } from './video-kind-badge'
import { VideoRowActions } from './video-row-actions'
import {
  VideoSelectAllCheckbox,
  VideoSelectCheckbox,
} from './video-select-checkbox'
import { VideoSelectionProvider } from './video-selection-provider'

interface Props {
  videos: Video[]
  /** 今の並べ替え */
  sort: VideoSort
  /** 今のページの URL のパラメータ。並べ替えのリンクで絞り込みを引き継ぐ */
  searchParams: URLSearchParams | string
}

interface SortLinkProps {
  field: VideoSortField
  label: string
  sort: VideoSort
  searchParams: URLSearchParams | string
}

/** 見出しの並べ替えのリンク。今の並べ替えの項目には、向きの矢印を付ける */
function SortLink({ field, label, sort, searchParams }: SortLinkProps) {
  const isCurrent = sort.field === field
  const Icon = !isCurrent
    ? ArrowUpDown
    : sort.order === 'asc'
      ? ArrowUp
      : ArrowDown

  return (
    <Link
      className="flex items-center gap-1 rounded-control focus-ring hover:text-accent"
      href={getVideoSortHref(searchParams, sort, field)}
    >
      {label}
      {isCurrent && (
        <span className="sr-only">
          （{sort.order === 'asc' ? '昇順' : '降順'}で並べ替え中）
        </span>
      )}
      <Icon
        aria-hidden="true"
        className={isCurrent ? 'size-3' : 'size-3 text-muted'}
      />
    </Link>
  )
}

/**
 * 動画の一覧の表。表、行、サムネイル、バッジ、日時はサーバーで描き、選択と操作
 * だけをクライアントの部品（`VideoSelectionProvider` の中）に任せる
 */
export default function VideoList({ videos, sort, searchParams }: Props) {
  return (
    <VideoSelectionProvider videoIds={videos.map((video) => video.id)}>
      <div>
        <VideoBulkActions
          videos={videos.map((video) => ({
            id: video.id,
            isDeleted: video.deleted_at !== null,
            title: video.title,
          }))}
        />

        <Table className="min-w-5xl">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <VideoSelectAllCheckbox />
              </TableHead>
              <TableHead>サムネイル</TableHead>
              <TableHead>タイトル</TableHead>
              <TableHead>タレント</TableHead>
              {/* 公開日時と更新日時の列。どちらかで、常に並べ替えている */}
              <TableHead aria-sort={toAriaSort(sort.order)}>
                <div className="flex flex-col gap-1">
                  <SortLink
                    field="published_at"
                    label="公開日時"
                    searchParams={searchParams}
                    sort={sort}
                  />
                  <SortLink
                    field="updated_at"
                    label="更新日時"
                    searchParams={searchParams}
                    sort={sort}
                  />
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
              videos.map((video) => (
                <TableRow key={video.id}>
                  <TableCell>
                    <VideoSelectCheckbox id={video.id} title={video.title} />
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
                          {formatDateTimeFromISO(video.published_at, {
                            includeSeconds: false,
                          })}
                        </time>
                      </dd>
                      <dt>更新</dt>
                      <dd>
                        <time dateTime={video.updated_at}>
                          {formatDateTimeFromISO(video.updated_at, {
                            includeSeconds: false,
                          })}
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
                    <VideoRowActions
                      externalUrl={getExternalVideoUrl(video)}
                      id={video.id}
                      isDeleted={video.deleted_at !== null}
                      platform={video.platform}
                      title={video.title}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell className="whitespace-normal" colSpan={10}>
                  <EmptyState icon={<VideoIcon />} title="動画がありません。" />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </VideoSelectionProvider>
  )
}

/** 動画の一覧の10列（選択、サムネイル、タイトル、タレント、日時、再生時間、クリック数、種別、ステータス、操作） */
const VIDEO_LIST_SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { cell: <Skeleton className="size-4" />, header: false, id: 'select' },
  {
    cell: <Skeleton className="aspect-video w-28 rounded-container" />,
    id: 'thumbnail',
  },
  {
    cell: (
      <div className="w-full min-w-64 space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    ),
    className: 'w-full',
    id: 'title',
  },
  { cell: <Skeleton className="h-4 w-20" />, id: 'talent' },
  {
    cell: (
      <div className="space-y-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-36" />
      </div>
    ),
    id: 'date',
  },
  { align: 'end', cell: <Skeleton className="h-4 w-14" />, id: 'duration' },
  { align: 'end', cell: <Skeleton className="h-4 w-10" />, id: 'clicks' },
  {
    cell: (
      <div className="space-y-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-16" />
      </div>
    ),
    id: 'kind',
  },
  { cell: <Skeleton className="h-5 w-16" />, id: 'status' },
  { cell: <Skeleton className="size-7" />, header: false, id: 'actions' },
]

interface VideoListSkeletonProps {
  /** 1ページの件数 */
  rows: number
}

/** 読み込み中の `VideoList`。一括操作のバーと、同じ列の表を並べる */
export function VideoListSkeleton({ rows }: VideoListSkeletonProps) {
  return (
    <TableSkeleton
      columns={VIDEO_LIST_SKELETON_COLUMNS}
      filterBar={<Skeleton className="mb-4 h-14 w-full rounded-container" />}
      rows={rows}
      tableClassName="min-w-5xl"
    />
  )
}
