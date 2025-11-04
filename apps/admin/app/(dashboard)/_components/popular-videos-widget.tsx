import { TIME_ZONE } from '@shinju-date/constants'
import { formatNumber } from '@shinju-date/helpers'
import { ExternalLink } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { Temporal } from 'temporal-polyfill'
import { PopularVideosListSkeleton } from '@/components/skeletons'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'
import { createSupabaseServerClient } from '@/lib/supabase'

export function PopularVideosWidgetSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-6 w-64 rounded bg-gray-200" />
      <PopularVideosListSkeleton />
    </div>
  )
}

/**
 * PopularVideosWidget - Displays popular videos ranking
 * This is an async Server Component that fetches its own data
 */
export async function PopularVideosWidget() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 29 })
  const popularVideos = await getPopularVideos(10, startDate, today)
  const supabaseClient = await createSupabaseServerClient()

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-xl">
        人気動画ランキング (過去30日間)
      </h2>
      {popularVideos.length > 0 ? (
        <div className="space-y-3">
          {popularVideos.map((video, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={video.id}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-600">
                {index + 1}
              </div>
              {video.thumbnail ? (
                <div className="relative h-16 w-28">
                  <Image
                    alt=""
                    className="rounded object-cover"
                    fill
                    sizes="112px"
                    src={
                      supabaseClient.storage
                        .from('thumbnails')
                        .getPublicUrl(video.thumbnail.path).data.publicUrl
                    }
                  />
                </div>
              ) : (
                <div className="h-16 w-28 rounded bg-gray-200" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{video.title}</p>
                <p className="text-gray-500 text-sm">
                  クリック数: {formatNumber(video.clicks)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  className="rounded bg-blue-600 px-3 py-1 text-sm text-white transition-colors hover:bg-blue-700"
                  href={`/videos/${video.id}`}
                >
                  詳細
                </Link>
                {video.youtube_video?.youtube_video_id && (
                  <a
                    className="flex items-center justify-center rounded border border-gray-300 bg-white p-1 transition-colors hover:bg-gray-50"
                    href={`https://www.youtube.com/watch?v=${video.youtube_video.youtube_video_id}`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-5 w-5 text-gray-600" />
                    <span className="sr-only">YouTubeで視聴</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-gray-500">データがありません</p>
      )}
    </div>
  )
}
