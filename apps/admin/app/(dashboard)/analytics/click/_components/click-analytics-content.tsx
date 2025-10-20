import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { getPopularVideos } from '@/lib/actions/get-popular-videos'
import { getClickVolume } from '../_lib/get-click-volume'
import { getPopularVideosForDate } from '../_lib/get-popular-videos-for-date'
import ClickAnalyticsClient from './click-analytics-client'

/**
 * ClickAnalyticsContent - Async component that fetches click analytics data
 * This component is wrapped with Suspense in the parent page
 */
export async function ClickAnalyticsContent() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 6 }).toString()
  const endDate = today.toString()

  const [popularVideos, clickVolume] = await Promise.all([
    getPopularVideos(20, 7, startDate, endDate),
    getClickVolume(7, startDate, endDate),
  ])

  const fetchClickVolume = async (start: string, end: string) => {
    'use server'
    return getClickVolume(7, start, end)
  }

  const fetchPopularVideos = async (
    start: string,
    end: string,
    limit: number,
  ) => {
    'use server'
    return getPopularVideos(limit, 7, start, end)
  }

  const fetchPopularVideosForDate = async (date: string, limit: number) => {
    'use server'
    return getPopularVideosForDate(date, limit)
  }

  return (
    <ClickAnalyticsClient
      fetchClickVolume={fetchClickVolume}
      fetchPopularVideos={fetchPopularVideos}
      fetchPopularVideosForDate={fetchPopularVideosForDate}
      initialClickVolume={clickVolume}
      initialPopularVideos={popularVideos}
    />
  )
}
