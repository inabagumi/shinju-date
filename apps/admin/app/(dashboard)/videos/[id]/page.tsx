import { formatNumber } from '@shinju-date/helpers'
import {
  formatDateTimeFromISO,
  formatDuration,
} from '@shinju-date/temporal-fns'
import { Alert, Button, PageHeader } from '@shinju-date/ui'
import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { type ReactNode, Suspense } from 'react'
import { BackLink } from '@/components/back-link'
import {
  ExternalVideoLink,
  getExternalVideoUrl,
} from '@/components/external-video-link'
import { DetailList, DetailRow, Panel } from '@/components/panel'
import { DetailCardsSkeleton } from '@/components/skeletons'
import { VideoStatusBadge } from '@/components/video-status-badge'
import { VideoThumbnail } from '@/components/video-thumbnail'
import { PlatformBadge } from '../_components/platform-badge'
import { VideoKindBadge } from '../_components/video-kind-badge'
import getVideo from '../_lib/get-video'
import {
  VideoActionsButtons,
  VideoDeleteButton,
} from './_components/video-actions-buttons'

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
  const hasExternalUrl = getExternalVideoUrl(video) !== null

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
        <Alert className="mb-6" title="削除された動画" tone="danger">
          この動画は削除されており、同期できません。
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Thumbnail and basic info */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <Panel title="サムネイル">
            <VideoThumbnail
              alt={video.title}
              size="lg"
              thumbnail={video.thumbnail}
            />
          </Panel>

          {/* Status */}
          <Panel title="ステータス">
            <VideoStatusBadge video={video} />
          </Panel>
        </div>

        {/* Video information */}
        <Panel
          description="現在データベースに保存されている情報"
          title="動画情報"
        >
          <DetailList>
            {details.map(({ label, value }) => (
              <DetailRow key={label} label={label}>
                {value}
              </DetailRow>
            ))}
          </DetailList>
        </Panel>
      </div>

      {/* External links */}
      <Panel
        className="mt-6"
        description={
          video.platform === 'twitch'
            ? 'Twitch上のオリジナル動画へのリンク'
            : 'YouTube上のオリジナル動画へのリンク'
        }
        title="外部リンク"
      >
        {hasExternalUrl && (
          <Button asChild className="gap-2" variant="secondary">
            <ExternalVideoLink video={video}>
              {video.platform === 'twitch' ? 'Twitchで見る' : 'YouTubeで見る'}
              <ExternalLink aria-hidden="true" className="size-4" />
            </ExternalVideoLink>
          </Button>
        )}
      </Panel>

      {/* Dangerous operations, kept apart from the ordinary ones above */}
      {!isDeleted && (
        <Alert
          action={<VideoDeleteButton video={video} />}
          aria-label="動画の削除"
          className="mt-6"
          role="region"
          title="動画の削除"
          tone="danger"
        >
          削除した動画は公開サイトに表示されなくなり、同期もできなくなります。
        </Alert>
      )}
    </div>
  )
}

export default function VideoDetailPage({ params }: Props) {
  return (
    <div>
      <div className="mb-4">
        <BackLink href="/videos">動画一覧に戻る</BackLink>
      </div>

      <Suspense fallback={<DetailCardsSkeleton />}>
        {params.then(({ id }) => (
          <CachedVideoDetails id={id} />
        ))}
      </Suspense>
    </div>
  )
}
