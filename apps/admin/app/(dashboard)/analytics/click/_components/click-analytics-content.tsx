import { TIME_ZONE } from '@shinju-date/constants'
import { Temporal } from 'temporal-polyfill'
import { getPopularChannels } from '@/lib/analytics/get-popular-channels'
import { getPopularVideos } from '@/lib/analytics/get-popular-videos'
import { getClickVolume } from '../_lib/get-click-volume'
import ClickAnalyticsClient from './click-analytics-client'

/**
 * ClickAnalyticsContent - Async component that fetches click analytics data
 * This component is wrapped with Suspense in the parent page
 */
export async function ClickAnalyticsContent() {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const startDate = today.subtract({ days: 6 })
  const endDate = today

  const [popularVideos, clickVolume, popularChannels] = await Promise.all([
    getPopularVideos(20, startDate, endDate),
    getClickVolume(7, startDate.toString(), endDate.toString()),
    getPopularChannels(20, startDate, endDate),
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
    const startDate = Temporal.PlainDate.from(start)
    const endDate = Temporal.PlainDate.from(end)
    return getPopularVideos(limit, startDate, endDate)
  }

  const fetchPopularChannels = async (
    start: string,
    end: string,
    limit: number,
  ) => {
    'use server'
    const startDate = Temporal.PlainDate.from(start)
    const endDate = Temporal.PlainDate.from(end)
    return getPopularChannels(limit, startDate, endDate)
  }

  const fetchPopularVideosForDate = async (date: string, limit: number) => {
    'use server'
    const plainDate = Temporal.PlainDate.from(date)
    return getPopularVideos(limit, plainDate)
  }

  const fetchPopularChannelsForDate = async (date: string, limit: number) => {
    'use server'
    const plainDate = Temporal.PlainDate.from(date)
    return getPopularChannels(limit, plainDate)
  }

  return (
    <ClickAnalyticsClient
      fetchClickVolume={fetchClickVolume}
      fetchPopularChannels={fetchPopularChannels}
      fetchPopularChannelsForDate={fetchPopularChannelsForDate}
      fetchPopularVideos={fetchPopularVideos}
      fetchPopularVideosForDate={fetchPopularVideosForDate}
      initialClickVolume={clickVolume}
      initialPopularChannels={popularChannels}
      initialPopularVideos={popularVideos}
    />
  )
}
