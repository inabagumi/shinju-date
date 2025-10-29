import { formatNumber } from '@shinju-date/helpers'
import {
  formatDateTimeFromISO,
  formatDuration,
} from '@shinju-date/temporal-fns'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Temporal } from 'temporal-polyfill'
import { ChevronLeftIcon, ExternalLinkIcon } from '@/components/icons'
import { supabaseClient } from '@/lib/supabase/public'
import getVideo from '../_lib/get-video'
import { SyncVideoButton } from './_components/sync-video-button'
import { VideoActionsButtons } from './_components/video-actions-buttons'

type Props = {
  params: Promise<{
    id: string
  }>
}

function getStatusText(video: {
  visible: boolean
  deleted_at: string | null
}): string {
  if (video.deleted_at) return '削除済み'
  if (video.visible) return '公開中'
  return '非表示'
}

function getStatusColor(video: {
  visible: boolean
  deleted_at: string | null
}): string {
  if (video.deleted_at) return 'bg-red-100 text-red-800'
  if (video.visible) return 'bg-green-100 text-green-800'
  return 'bg-gray-100 text-gray-800'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
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

export default async function VideoDetailPage({ params }: Props) {
  const { id } = await params

  const video = await getVideo(id)

  if (!video) {
    notFound()
  }

  const isDeleted = video.deleted_at !== null

  return (
    <div className="p-4">
      {/* Back button */}
      <div className="mb-6">
        <Link
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
          href="/videos"
        >
          <ChevronLeftIcon className="mr-1 h-4 w-4" />
          動画一覧に戻る
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="break-words font-bold text-2xl">{video.title}</h1>
            <p className="text-gray-600">動画詳細</p>
          </div>
          {!isDeleted && (
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <VideoActionsButtons
                isDeleted={isDeleted}
                videoSlug={video.slug}
                visible={video.visible}
              />
              <SyncVideoButton videoSlug={video.slug} />
            </div>
          )}
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
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                サムネイル
              </h3>
            </div>
            <div className="border-gray-200 border-t p-4">
              {video.thumbnail ? (
                <div className="relative aspect-video w-full">
                  <Image
                    alt={video.title}
                    className="object-cover"
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    src={
                      supabaseClient.storage
                        .from('thumbnails')
                        .getPublicUrl(video.thumbnail.path).data.publicUrl
                    }
                  />
                </div>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center bg-gray-200 text-gray-500">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="overflow-hidden bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="font-medium text-gray-900 text-lg leading-6">
                ステータス
              </h3>
            </div>
            <div className="border-gray-200 border-t px-4 py-5 sm:px-6">
              <span
                className={`inline-flex rounded-full px-2 py-1 font-semibold text-xs leading-5 ${getStatusColor(video)}`}
              >
                {getStatusText(video)}
              </span>
            </div>
          </div>
        </div>

        {/* Video information */}
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="font-medium text-gray-900 text-lg leading-6">
              動画情報
            </h3>
            <p className="mt-1 max-w-2xl text-gray-500 text-sm">
              現在データベースに保存されている情報
            </p>
          </div>
          <div className="border-gray-200 border-t">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">タイトル</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {video.title}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">動画ID</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                    {video.slug}
                  </code>
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  チャンネル
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  <Link
                    className="text-blue-600 hover:text-blue-800"
                    href={`/channels/${video.channel.slug}`}
                  >
                    {video.channel.name}
                  </Link>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">再生時間</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatDuration(Temporal.Duration.from(video.duration))}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  クリック数（7日間）
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatNumber(video.clicks)}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">公開日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatDateTimeFromISO(video.published_at)}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">作成日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatDateTimeFromISO(video.created_at)}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  最終更新日時
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {formatDateTimeFromISO(video.updated_at)}
                </dd>
              </div>
              {isDeleted && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-500 text-sm">
                    削除日時
                  </dt>
                  <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                    {video.deleted_at
                      ? formatDateTimeFromISO(video.deleted_at)
                      : '-'}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* External links */}
      <div className="mt-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="font-medium text-gray-900 text-lg leading-6">
              外部リンク
            </h3>
            <p className="mt-1 max-w-2xl text-gray-500 text-sm">
              YouTube上のオリジナル動画へのリンク
            </p>
          </div>
          <div className="border-gray-200 border-t px-4 py-5 sm:px-6">
            <a
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50"
              href={`https://www.youtube.com/watch?v=${video.slug}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              YouTubeで見る
              <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
