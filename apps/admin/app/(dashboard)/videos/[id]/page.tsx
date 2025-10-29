import { formatNumber } from '@shinju-date/helpers'
import { formatDuration } from '@shinju-date/temporal-fns'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Temporal } from 'temporal-polyfill'
import { supabaseClient } from '@/lib/supabase/public'
import getVideo from '../_lib/get-video'
import { SyncVideoButton } from './_components/sync-video-button'

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

  const isDeleted = !!video.deleted_at

  return (
    <div className="p-4">
      {/* Back button */}
      <div className="mb-6">
        <Link
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
          href="/videos"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <title>戻る</title>
            <path
              d="M15 19l-7-7 7-7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          動画一覧に戻る
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl line-clamp-2">{video.title}</h1>
            <p className="text-gray-600">動画詳細</p>
          </div>
          {!isDeleted && <SyncVideoButton videoSlug={video.slug} />}
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
            <div className="border-t border-gray-200 p-4">
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
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
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
          <div className="border-t border-gray-200">
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
                    href={`/channels/${video.channel.id}`}
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
                  {new Date(video.published_at).toLocaleString('ja-JP', {
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    month: '2-digit',
                    second: '2-digit',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">作成日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {new Date(video.created_at).toLocaleString('ja-JP', {
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    month: '2-digit',
                    second: '2-digit',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">
                  最終更新日時
                </dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {new Date(video.updated_at).toLocaleString('ja-JP', {
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    month: '2-digit',
                    second: '2-digit',
                    year: 'numeric',
                  })}
                </dd>
              </div>
              {isDeleted && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="font-medium text-gray-500 text-sm">
                    削除日時
                  </dt>
                  <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                    {new Date(video.deleted_at!).toLocaleString('ja-JP', {
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      month: '2-digit',
                      second: '2-digit',
                      year: 'numeric',
                    })}
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
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <a
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50"
              href={`https://www.youtube.com/watch?v=${video.slug}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              YouTubeで見る
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>外部リンク</title>
                <path
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
