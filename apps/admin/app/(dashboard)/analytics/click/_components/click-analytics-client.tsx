'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Temporal } from 'temporal-polyfill'
import type {
  PopularChannel,
  PopularChannelWithComparison,
} from '@/lib/analytics/get-popular-channels'
import type { PopularVideo } from '@/lib/analytics/get-popular-videos'
import type { DateRange } from '../../_components/date-range-picker'
import DateRangePicker from '../../_components/date-range-picker'
import { exportToCSV } from '../../_lib/export-csv'
import ClickVolumeChart from '../_components/click-volume-chart'
import type { DailyClickVolume } from '../_lib/get-click-volume'
import { PopularChannelsWidget } from './popular-channels-widget'

type ClickAnalyticsClientProps = {
  initialClickVolume: DailyClickVolume[]
  initialPopularVideos: PopularVideo[]
  initialPopularChannels: PopularChannel[]
  fetchClickVolume: (
    startDate: string,
    endDate: string,
  ) => Promise<DailyClickVolume[]>
  fetchPopularVideos: (
    startDate: string,
    endDate: string,
    limit: number,
  ) => Promise<PopularVideo[]>
  fetchPopularVideosForDate: (
    date: string,
    limit: number,
  ) => Promise<PopularVideo[]>
  fetchPopularChannels: (
    startDate: string,
    endDate: string,
    limit: number,
  ) => Promise<PopularChannel[]>
  fetchPopularChannelsWithComparison: (
    startDate: string,
    endDate: string,
    limit: number,
  ) => Promise<PopularChannelWithComparison[]>
  fetchPopularChannelsForDate: (
    date: string,
    limit: number,
  ) => Promise<PopularChannel[]>
}

export default function ClickAnalyticsClient({
  initialClickVolume,
  initialPopularVideos,
  initialPopularChannels,
  fetchClickVolume,
  fetchPopularVideos,
  fetchPopularVideosForDate,
  fetchPopularChannels,
  fetchPopularChannelsWithComparison,
  fetchPopularChannelsForDate,
}: ClickAnalyticsClientProps) {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const [dateRange, setDateRange] = useState<DateRange>({
    endDate: today.toString(),
    startDate: today.subtract({ days: 6 }).toString(),
  })
  const [comparisonEnabled, setComparisonEnabled] = useState(false)
  const [clickVolume, setClickVolume] =
    useState<DailyClickVolume[]>(initialClickVolume)
  const [previousClickVolume, setPreviousClickVolume] = useState<
    DailyClickVolume[]
  >([])
  const [popularVideos, setPopularVideos] =
    useState<PopularVideo[]>(initialPopularVideos)
  const [popularChannels, setPopularChannels] = useState<
    PopularChannel[] | PopularChannelWithComparison[]
  >(initialPopularChannels)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const totalClicks = clickVolume.reduce((sum, day) => sum + day.clicks, 0)
  const previousTotalClicks = previousClickVolume.reduce(
    (sum, day) => sum + day.clicks,
    0,
  )
  const changePercent =
    previousTotalClicks > 0
      ? ((totalClicks - previousTotalClicks) / previousTotalClicks) * 100
      : 0

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const channelsDataPromise = comparisonEnabled
          ? fetchPopularChannelsWithComparison(
              dateRange.startDate,
              dateRange.endDate,
              20,
            )
          : fetchPopularChannels(dateRange.startDate, dateRange.endDate, 20)

        const [volumeData, videosData, channelsData] = await Promise.all([
          fetchClickVolume(dateRange.startDate, dateRange.endDate),
          fetchPopularVideos(dateRange.startDate, dateRange.endDate, 20),
          channelsDataPromise,
        ])
        setClickVolume(volumeData)
        setPopularVideos(videosData)
        setPopularChannels(channelsData)
        setSelectedDate(null)

        if (comparisonEnabled) {
          const start = Temporal.PlainDate.from(dateRange.startDate)
          const end = Temporal.PlainDate.from(dateRange.endDate)
          const duration = end.since(start).days + 1
          const previousEnd = start.subtract({ days: 1 })
          const previousStart = previousEnd.subtract({ days: duration - 1 })

          const previousData = await fetchClickVolume(
            previousStart.toString(),
            previousEnd.toString(),
          )
          setPreviousClickVolume(previousData)
        } else {
          setPreviousClickVolume([])
        }
      } catch (error) {
        logger.error('分析データの取得に失敗しました', {
          endDate: dateRange.endDate,
          error,
          startDate: dateRange.startDate,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [
    dateRange,
    comparisonEnabled,
    fetchClickVolume,
    fetchPopularVideos,
    fetchPopularChannels,
    fetchPopularChannelsWithComparison,
  ])

  const handleDateClick = async (date: string) => {
    setSelectedDate(date)
    setLoading(true)
    try {
      const [dateVideos, dateChannels] = await Promise.all([
        fetchPopularVideosForDate(date, 20),
        fetchPopularChannelsForDate(date, 20),
      ])
      setPopularVideos(dateVideos)
      setPopularChannels(dateChannels)
    } catch (error) {
      logger.error('日付別データの取得に失敗しました', { date, error })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    const csvData = popularVideos.map((video, index) => ({
      クリック数: video.clicks,
      スラッグ: video.slug,
      タイトル: video.title,
      順位: index + 1,
    }))
    const dateStr =
      selectedDate || `${dateRange.startDate}_${dateRange.endDate}`
    exportToCSV(csvData, `click-analytics-videos-${dateStr}.csv`)
  }

  const handleChannelsExportCSV = () => {
    const csvData = popularChannels.map((channel, index) => ({
      クリック数: channel.clicks,
      スラッグ: channel.slug,
      チャンネル名: channel.name,
      順位: index + 1,
    }))
    const dateStr =
      selectedDate || `${dateRange.startDate}_${dateRange.endDate}`
    exportToCSV(csvData, `click-analytics-channels-${dateStr}.csv`)
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">クリックアナリティクス</h1>

      <div className="mb-6">
        <DateRangePicker
          onChange={setDateRange}
          onComparisonToggle={setComparisonEnabled}
          showComparison={true}
          value={dateRange}
        />
      </div>

      <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/80 backdrop-blur-sm">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 text-blue-700 shadow-lg">
              読み込み中...
            </div>
          </div>
        )}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-xl">クリックボリューム</h2>
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <p className="text-gray-600 text-sm">総クリック数</p>
            <div className="flex items-baseline gap-2">
              <p className="font-bold text-2xl text-green-600">{totalClicks}</p>
              {comparisonEnabled && previousTotalClicks > 0 && (
                <span
                  className={`text-sm ${
                    changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {changePercent >= 0 ? '▲' : '▼'}
                  {Math.abs(changePercent).toFixed(1)}% vs 前期間
                </span>
              )}
            </div>
          </div>
          <ClickVolumeChart data={clickVolume} onDateClick={handleDateClick} />
          {selectedDate && (
            <p className="mt-2 text-center text-gray-600 text-sm">
              選択された日付: {selectedDate}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">
              {selectedDate
                ? `人気動画ランキング (${selectedDate})`
                : `人気動画ランキング (${dateRange.startDate} 〜 ${dateRange.endDate})`}
            </h2>
            <button
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
              onClick={handleExportCSV}
              type="button"
            >
              CSV エクスポート
            </button>
          </div>
          <p className="mb-4 text-gray-600 text-sm">
            最もクリックされている動画のランキング。ユーザーの興味を把握できます。
          </p>
          {popularVideos.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {popularVideos.map((item, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  key={item.slug}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-600 text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <Link
                      className="font-medium hover:underline"
                      href={`/videos?search=${item.slug}`}
                    >
                      {item.title}
                    </Link>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-900">{item.clicks}</p>
                    <p className="text-gray-500 text-xs">回</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">データがありません</p>
          )}
        </div>

        <PopularChannelsWidget
          channels={popularChannels}
          comparisonEnabled={comparisonEnabled}
          dateRange={dateRange}
          loading={loading}
          onExportCSV={handleChannelsExportCSV}
          selectedDate={selectedDate}
        />
      </div>
    </div>
  )
}
