import { formatNumber, getVideoExternalUrl } from '@shinju-date/helpers'
import {
  formatDateTimeFromISO,
  formatDuration,
} from '@shinju-date/temporal-fns'
import { Button, PageHeader, twMerge } from '@shinju-date/ui'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type ReactNode, Suspense } from 'react'
import { DetailCardsSkeleton } from '@/components/skeletons'
import { PlatformBadge } from '../_components/platform-badge'
import { VideoKindBadge } from '../_components/video-kind-badge'
import { VideoStatusBadge } from '../_components/video-status-badge'
import getVideo from '../_lib/get-video'
import {
  VideoActionsButtons,
  VideoDeleteButton,
} from './_components/video-actions-buttons'

/** 詳細ページのパネル */
const panelClassName = 'rounded-container border border-border bg-surface p-6'
const panelTitleClassName = 'text-body leading-normal font-semibold'

interface DetailItem {
  label: string
  value: ReactNode
}

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  'use cache: private'

  cacheLife('minutes')

  const { id } = await params

  const video = await getVideo(id)

  if (!video) {
    return {
      title: '動画が見つかりません',
    }
  }

  return {
    title: `${video.title} - 動画詳細`,
  }
}

async function CachedVideoDetails({ id }: { id: string }) {
  'use cache: private'

  cacheLife('minutes')

  const video = await getVideo(id)

  if (!video) {
    notFound()
  }

  const isDeleted = video.deleted_at !== null
  const externalUrl = getVideoExternalUrl({
    platform: video.platform,
    status: video.status,
    twitchLoginName: video.twitch_video?.twitch_user?.twitch_login_name,
    twitchVideoId: video.twitch_video?.twitch_video_id,
    twitchVideoType: video.twitch_video?.type,
    youtubeVideoId: video.youtube_video?.youtube_video_id,
  })

  const details: DetailItem[] = [
    { label: 'タイトル', value: video.title },
    {
      label: 'プラットフォーム',
      value: <PlatformBadge platform={video.platform} />,
    },
    {
      label: video.platform === 'twitch' ? 'Twitch動画ID' : 'YouTube動画ID',
      value: (
        <code className="rounded-control bg-muted px-2 py-1 font-mono text-caption">
          {video.platform === 'twitch'
            ? (video.twitch_video?.twitch_video_id ?? 'N/A')
            : (video.youtube_video?.youtube_video_id ?? 'N/A')}
        </code>
      ),
    },
    ...(video.platform === 'twitch' && video.twitch_video?.type
      ? [{ label: 'Twitch種別', value: video.twitch_video.type }]
      : []),
    {
      label: 'タレント',
      value: video.talent ? (
        <Link
          className="text-accent hover:underline"
          href={`/talents/${video.talent.id}`}
        >
          {video.talent.name}
        </Link>
      ) : (
        <span className="text-muted">タレント不明</span>
      ),
    },
    {
      label: '再生時間',
      value: (
        <span className="tabular-nums">
          {formatDuration(Temporal.Duration.from(video.duration))}
        </span>
      ),
    },
    {
      label: '動画種別',
      value: <VideoKindBadge videoKind={video.video_kind} />,
    },
    {
      label: 'クリック数（7日間）',
      value: <span className="tabular-nums">{formatNumber(video.clicks)}</span>,
    },
    {
      label: '公開日時',
      value: (
        <time className="tabular-nums" dateTime={video.published_at}>
          {formatDateTimeFromISO(video.published_at)}
        </time>
      ),
    },
    {
      label: '作成日時',
      value: (
        <time className="tabular-nums" dateTime={video.created_at}>
          {formatDateTimeFromISO(video.created_at)}
        </time>
      ),
    },
    {
      label: '最終更新日時',
      value: (
        <time className="tabular-nums" dateTime={video.updated_at}>
          {formatDateTimeFromISO(video.updated_at)}
        </time>
      ),
    },
    ...(video.deleted_at
      ? [
          {
            label: '削除日時',
            value: (
              <time className="tabular-nums" dateTime={video.deleted_at}>
                {formatDateTimeFromISO(video.deleted_at)}
              </time>
            ),
          },
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        actions={<VideoActionsButtons video={video} />}
        description="動画詳細"
        title={<span className="wrap-break-word">{video.title}</span>}
      />

      {/* Status indicator */}
      {isDeleted && (
        <div
          className="mb-6 rounded-container border border-danger/30 bg-danger/10 p-4 text-danger"
          role="status"
        >
          <p className="text-body leading-normal font-semibold">
            削除された動画
          </p>
          <p className="mt-1 text-meta">
            この動画は削除されており、同期できません。
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Thumbnail and basic info */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <section className={panelClassName}>
            <h2 className={panelTitleClassName}>サムネイル</h2>
            {video.thumbnail ? (
              <div className="relative mt-4 aspect-video w-full">
                <Image
                  alt={video.title}
                  blurDataURL={video.thumbnail.blur_data_url}
                  className="rounded-container object-cover"
                  fill
                  placeholder="blur"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  src={`/images/thumbnails/${video.thumbnail.id}`}
                />
              </div>
            ) : (
              <div className="mt-4 flex aspect-video w-full items-center justify-center rounded-container bg-muted text-meta text-muted">
                No Image
              </div>
            )}
          </section>

          {/* Status */}
          <section className={panelClassName}>
            <h2 className={panelTitleClassName}>ステータス</h2>
            <div className="mt-4">
              <VideoStatusBadge video={video} />
            </div>
          </section>
        </div>

        {/* Video information */}
        <section className={twMerge(panelClassName, 'p-0')}>
          <div className="p-6 pb-4">
            <h2 className={panelTitleClassName}>動画情報</h2>
            <p className="mt-1 text-meta text-muted">
              現在データベースに保存されている情報
            </p>
          </div>
          <dl className="divide-y divide-border border-t border-border">
            {details.map(({ label, value }) => (
              <div
                className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4"
                key={label}
              >
                <dt className="text-meta text-muted">{label}</dt>
                <dd className="mt-1 text-meta wrap-break-word sm:col-span-2 sm:mt-0">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      {/* External links */}
      <section className={twMerge(panelClassName, 'mt-6')}>
        <h2 className={panelTitleClassName}>外部リンク</h2>
        <p className="mt-1 text-meta text-muted">
          {video.platform === 'twitch'
            ? 'Twitch上のオリジナル動画へのリンク'
            : 'YouTube上のオリジナル動画へのリンク'}
        </p>
        {externalUrl && (
          <Button asChild className="mt-4 gap-2" variant="secondary">
            <a href={externalUrl} rel="noopener noreferrer" target="_blank">
              {video.platform === 'twitch' ? 'Twitchで見る' : 'YouTubeで見る'}
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </Button>
        )}
      </section>

      {/* Dangerous operations, kept apart from the ordinary ones above */}
      {!isDeleted && (
        <section className={twMerge(panelClassName, 'mt-6 border-danger/30')}>
          <h2 className={panelTitleClassName}>動画の削除</h2>
          <p className="mt-1 text-meta text-muted">
            削除した動画は公開サイトに表示されなくなり、同期もできなくなります。
          </p>
          <div className="mt-4">
            <VideoDeleteButton video={video} />
          </div>
        </section>
      )}
    </div>
  )
}

export default function VideoDetailPage({ params }: Props) {
  return (
    <div>
      <div className="mb-4">
        <Link
          className="inline-flex items-center rounded-control text-meta text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          href="/videos"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 size-4" />
          動画一覧に戻る
        </Link>
      </div>

      <Suspense fallback={<DetailCardsSkeleton />}>
        {params.then(({ id }) => (
          <CachedVideoDetails id={id} />
        ))}
      </Suspense>
    </div>
  )
}
