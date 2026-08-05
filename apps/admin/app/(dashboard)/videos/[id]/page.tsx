import { formatNumber, getVideoExternalUrl } from '@shinju-date/helpers'
import {
  formatDateTimeFromISO,
  formatDuration,
} from '@shinju-date/temporal-fns'
import { Card, CardContent, CardHeader } from '@shinju-date/ui'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import { cacheLife } from 'next/cache'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { Temporal } from 'temporal-polyfill'
import { DetailCardsSkeleton } from '@/components/skeletons'
import { PlatformBadge } from '../_components/platform-badge'
import { VideoKindBadge } from '../_components/video-kind-badge'
import { VideoStatusBadge } from '../_components/video-status-badge'
import getVideo from '../_lib/get-video'
import { VideoActionsButtons } from './_components/video-actions-buttons'

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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="wrap-break-word font-bold text-2xl">
              {video.title}
            </h1>
            <p className="text-gray-600">動画詳細</p>
          </div>
          <VideoActionsButtons video={video} />
        </div>
      </div>

      {/* Status indicator */}
      {isDeleted && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="font-medium text-red-800 text-sm">
                削除された動画
              </h3>
              <div className="mt-2 text-red-700 text-sm">
                <p>この動画は削除されており、同期できません。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Thumbnail and basic info */}
        <div className="space-y-6">
          {/* Thumbnail */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                サムネイル
              </h3>
            </CardHeader>
            <CardContent>
              {video.thumbnail ? (
                <div className="relative aspect-video w-full">
                  <Image
                    alt={video.title}
                    blurDataURL={video.thumbnail.blur_data_url}
                    className="object-cover"
                    fill
                    placeholder="blur"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    src={`/images/thumbnails/${video.thumbnail.id}`}
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gray-200 text-gray-500">
                  No Image
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card variant="elevated">
            <CardHeader>
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                ステータス
              </h3>
            </CardHeader>
            <CardContent>
              <VideoStatusBadge video={video} />
            </CardContent>
          </Card>
        </div>

        {/* Video information */}
        <Card variant="elevated">
          <CardHeader>
            <h3 className="font-medium text-gray-900 text-lg leading-6">
              動画情報
            </h3>
            <p className="mt-1 max-w-2xl text-gray-500 text-sm">
              現在データベースに保存されている情報
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="[&>div:nth-of-type(even)]:bg-white [&>div:nth-of-type(odd)]:bg-gray-50">
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">タイトル</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {video.title}
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  プラットフォーム
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <PlatformBadge platform={video.platform} />
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  {video.platform === 'twitch'
                    ? 'Twitch動画ID'
                    : 'YouTube動画ID'}
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                    {video.platform === 'twitch'
                      ? (video.twitch_video?.twitch_video_id ?? 'N/A')
                      : (video.youtube_video?.youtube_video_id ?? 'N/A')}
                  </code>
                </dd>
              </div>
              {video.platform === 'twitch' && video.twitch_video?.type && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-500 text-sm">
                    Twitch種別
                  </dt>
                  <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                    {video.twitch_video.type}
                  </dd>
                </div>
              )}
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">タレント</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <Link
                    className="text-774-blue-600 hover:text-774-blue-800"
                    href={`/talents/${video.talent.id}`}
                    prefetch={true}
                  >
                    {video.talent.name}
                  </Link>
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">再生時間</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatDuration(Temporal.Duration.from(video.duration))}
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">動画種別</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <VideoKindBadge videoKind={video.video_kind} />
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  クリック数（7日間）
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatNumber(video.clicks)}
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">公開日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <time dateTime={video.published_at}>
                    {formatDateTimeFromISO(video.published_at)}
                  </time>
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">作成日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <time dateTime={video.created_at}>
                    {formatDateTimeFromISO(video.created_at)}
                  </time>
                </dd>
              </div>
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  最終更新日時
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <time dateTime={video.updated_at}>
                    {formatDateTimeFromISO(video.updated_at)}
                  </time>
                </dd>
              </div>
              {isDeleted && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-500 text-sm">
                    削除日時
                  </dt>
                  <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                    {video.deleted_at ? (
                      <time dateTime={video.deleted_at}>
                        {formatDateTimeFromISO(video.deleted_at)}
                      </time>
                    ) : (
                      '-'
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* External links */}
      <div className="mt-6">
        <Card variant="elevated">
          <CardHeader>
            <h3 className="font-medium text-gray-900 text-lg leading-6">
              外部リンク
            </h3>
            <p className="mt-1 max-w-2xl text-gray-500 text-sm">
              {video.platform === 'twitch'
                ? 'Twitch上のオリジナル動画へのリンク'
                : 'YouTube上のオリジナル動画へのリンク'}
            </p>
          </CardHeader>
          <CardContent>
            {externalUrl && (
              <a
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50"
                href={externalUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                {video.platform === 'twitch' ? 'Twitchで見る' : 'YouTubeで見る'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function VideoDetailPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-7xl p-4">
      <div className="mb-6">
        <Link
          className="inline-flex items-center text-774-blue-600 hover:text-774-blue-800"
          href="/videos"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
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
