import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, ExternalLinkIcon } from '@/components/icons'
import { supabaseClient } from '@/lib/supabase/public'
import getChannel from '../_lib/get-channel'
import getRecentVideosForChannel from '../_lib/get-recent-videos'
import { EditChannelForm } from './_components/edit-channel-form'
import { SyncChannelButton } from './_components/sync-channel-button'

type Props = {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const channel = await getChannel(id)

  if (!channel) {
    return {
      title: 'チャンネルが見つかりません',
    }
  }

  return {
    title: `${channel.name} - チャンネル詳細`,
  }
}

export default async function ChannelDetailPage({ params }: Props) {
  const { id } = await params

  const channel = await getChannel(id)

  if (!channel) {
    notFound()
  }

  const [recentVideos] = await Promise.all([
    getRecentVideosForChannel(channel.id, 5),
  ])

  const isDeleted = channel.deleted_at !== null

  return (
    <div className="p-4">
      {/* Back button */}
      <div className="mb-6">
        <Link
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
          href="/channels"
        >
          <ChevronLeftIcon className="mr-1 h-4 w-4" />
          チャンネル一覧に戻る
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-2xl">{channel.name}</h1>
            <p className="text-gray-600">チャンネル詳細</p>
          </div>
          {!isDeleted && <SyncChannelButton channelId={channel.id} />}
        </div>
      </div>

      {/* Status indicator */}
      {isDeleted && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="font-medium text-red-800 text-sm">
                削除されたチャンネル
              </h3>
              <div className="mt-2 text-red-700 text-sm">
                <p>このチャンネルは削除されており、同期できません。</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel information - Editable form */}
      <EditChannelForm channel={channel} />

      {/* Additional metadata */}
      <div className="mt-6 overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="font-medium text-gray-900 text-lg leading-6">
            メタデータ
          </h3>
        </div>
        <div className="border-gray-200 border-t">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                データベースID
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {channel.id}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">作成日時</dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {formatDateTimeFromISO(channel.created_at)}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                最終更新日時
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {formatDateTimeFromISO(channel.updated_at)}
              </dd>
            </div>
            {isDeleted && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="font-medium text-gray-500 text-sm">削除日時</dt>
                <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                  {channel.deleted_at
                    ? formatDateTimeFromISO(channel.deleted_at)
                    : '-'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Recent Videos */}
      <div className="mt-6">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="font-medium text-gray-900 text-lg leading-6">
              最新動画
            </h3>
            <p className="mt-1 max-w-2xl text-gray-500 text-sm">
              直近に公開された動画一覧
            </p>
          </div>
          <div className="border-gray-200 border-t">
            {recentVideos.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                動画がありません。
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentVideos.map((video) => (
                  <li className="px-4 py-4" key={video.id}>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {video.thumbnail ? (
                          <div className="relative h-12 w-20">
                            <Image
                              alt={video.title}
                              className="rounded object-cover"
                              fill
                              sizes="80px"
                              src={
                                supabaseClient.storage
                                  .from('thumbnails')
                                  .getPublicUrl(video.thumbnail.path).data
                                  .publicUrl
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex h-12 w-20 items-center justify-center rounded bg-gray-200 text-gray-500 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          className="text-blue-600 hover:text-blue-800"
                          href={`/videos/${video.id}`}
                        >
                          <p className="truncate font-medium text-sm">
                            {video.title}
                          </p>
                        </Link>
                        <p className="text-gray-500 text-sm">
                          {formatDateTimeFromISO(video.published_at)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 font-semibold text-xs leading-5 ${
                            video.deleted_at
                              ? 'bg-red-100 text-red-800'
                              : video.visible
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {video.deleted_at
                            ? '削除済み'
                            : video.visible
                              ? '公開中'
                              : '非表示'}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
              YouTube上のオリジナルチャンネルへのリンク
            </p>
          </div>
          <div className="border-gray-200 border-t px-4 py-5 sm:px-6">
            {channel.youtube_channel?.youtube_channel_id && (
              <a
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 text-sm shadow-sm hover:bg-gray-50"
                href={`https://www.youtube.com/channel/${channel.youtube_channel.youtube_channel_id}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                YouTubeで見る
                <ExternalLinkIcon className="ml-2 h-4 w-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
