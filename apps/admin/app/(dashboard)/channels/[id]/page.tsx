import { formatNumber } from '@shinju-date/helpers'
import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeftIcon, ExternalLinkIcon } from '@/components/icons'
import getChannel from '../_lib/get-channel'
import { SyncChannelButton } from './_components/sync-channel-button'

type Props = {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const channelId = Number.parseInt(id, 10)

  if (Number.isNaN(channelId)) {
    return {
      title: 'チャンネルが見つかりません',
    }
  }

  const channel = await getChannel(channelId)

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
  const channelId = Number.parseInt(id, 10)

  if (Number.isNaN(channelId)) {
    notFound()
  }

  const channel = await getChannel(channelId)

  if (!channel) {
    notFound()
  }

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
          {!isDeleted && <SyncChannelButton channelId={channelId} />}
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

      {/* Channel information */}
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="font-medium text-gray-900 text-lg leading-6">
            チャンネル情報
          </h3>
          <p className="mt-1 max-w-2xl text-gray-500 text-sm">
            現在データベースに保存されている情報
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                チャンネル名
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {channel.name}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                チャンネルID
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                  {channel.slug}
                </code>
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="font-medium text-gray-500 text-sm">
                データベースID
              </dt>
              <dd className="mt-1 text-gray-900 text-sm sm:col-span-2 sm:mt-0">
                {formatNumber(channel.id)}
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
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <a
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 text-sm font-medium shadow-sm hover:bg-gray-50"
              href={`https://www.youtube.com/channel/${channel.slug}`}
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
