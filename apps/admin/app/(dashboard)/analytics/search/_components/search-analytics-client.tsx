'use client'

import { TIME_ZONE } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { useEffect, useState } from 'react'
import { Temporal } from 'temporal-polyfill'
import type { DateRange } from '../../_components/date-range-picker'
import DateRangePicker from '../../_components/date-range-picker'
import { exportToCSV } from '../../_lib/export-csv'
import SearchVolumeChart from '../_components/search-volume-chart'
import type { DailySearchVolume } from '../_lib/get-search-volume'

type PopularKeyword = {
  keyword: string
  count: number
}

type SearchAnalyticsClientProps = {
  initialSearchVolume: DailySearchVolume[]
  initialPopularKeywords: PopularKeyword[]
  initialZeroResultKeywords: string[]
  fetchSearchVolume: (
    startDate: string,
    endDate: string,
  ) => Promise<DailySearchVolume[]>
  fetchPopularKeywords: (
    date: string,
    limit: number,
  ) => Promise<PopularKeyword[]>
  fetchPopularKeywordsForRange: (
    startDate: string,
    endDate: string,
    limit: number,
  ) => Promise<PopularKeyword[]>
  fetchZeroResultKeywords: () => Promise<string[]>
}

export default function SearchAnalyticsClient({
  initialSearchVolume,
  initialPopularKeywords,
  initialZeroResultKeywords,
  fetchSearchVolume,
  fetchPopularKeywords,
  fetchPopularKeywordsForRange,
  fetchZeroResultKeywords,
}: SearchAnalyticsClientProps) {
  const today = Temporal.Now.zonedDateTimeISO(TIME_ZONE).toPlainDate()
  const [dateRange, setDateRange] = useState<DateRange>({
    endDate: today.toString(),
    startDate: today.subtract({ days: 6 }).toString(),
  })
  const [comparisonEnabled, setComparisonEnabled] = useState(false)
  const [searchVolume, setSearchVolume] =
    useState<DailySearchVolume[]>(initialSearchVolume)
  const [previousSearchVolume, setPreviousSearchVolume] = useState<
    DailySearchVolume[]
  >([])
  const [popularKeywords, setPopularKeywords] = useState<PopularKeyword[]>(
    initialPopularKeywords,
  )
  const [zeroResultKeywords, setZeroResultKeywords] = useState<string[]>(
    initialZeroResultKeywords,
  )
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const totalSearches = searchVolume.reduce((sum, day) => sum + day.count, 0)
  const previousTotalSearches = previousSearchVolume.reduce(
    (sum, day) => sum + day.count,
    0,
  )
  const changePercent =
    previousTotalSearches > 0
      ? ((totalSearches - previousTotalSearches) / previousTotalSearches) * 100
      : 0

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [volumeData, keywordsData, zeroData] = await Promise.all([
          fetchSearchVolume(dateRange.startDate, dateRange.endDate),
          // Use range aggregation when no specific date is selected
          fetchPopularKeywordsForRange(
            dateRange.startDate,
            dateRange.endDate,
            20,
          ),
          fetchZeroResultKeywords(),
        ])
        setSearchVolume(volumeData)
        setPopularKeywords(keywordsData)
        setZeroResultKeywords(zeroData)
        setSelectedDate(null)

        if (comparisonEnabled) {
          const start = Temporal.PlainDate.from(dateRange.startDate)
          const end = Temporal.PlainDate.from(dateRange.endDate)
          const duration = end.since(start).days + 1
          const previousEnd = start.subtract({ days: 1 })
          const previousStart = previousEnd.subtract({ days: duration - 1 })

          const previousData = await fetchSearchVolume(
            previousStart.toString(),
            previousEnd.toString(),
          )
          setPreviousSearchVolume(previousData)
        } else {
          setPreviousSearchVolume([])
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
    fetchSearchVolume,
    fetchPopularKeywordsForRange,
    fetchZeroResultKeywords,
  ])

  const handleDateClick = async (date: string) => {
    // If clicking the same date, clear selection and return to range view
    if (selectedDate === date) {
      setSelectedDate(null)
      setLoading(true)
      try {
        const keywordsData = await fetchPopularKeywordsForRange(
          dateRange.startDate,
          dateRange.endDate,
          20,
        )
        setPopularKeywords(keywordsData)
      } catch (error) {
        logger.error('期間別キーワードの取得に失敗しました', {
          endDate: dateRange.endDate,
          error,
          startDate: dateRange.startDate,
        })
      } finally {
        setLoading(false)
      }
      return
    }

    // Set new selected date and fetch data for that specific date
    setSelectedDate(date)
    setLoading(true)
    try {
      const keywordsData = await fetchPopularKeywords(date, 20)
      setPopularKeywords(keywordsData)
    } catch (error) {
      logger.error('日別キーワードの取得に失敗しました', {
        date,
        error,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportKeywords = () => {
    const csvData = popularKeywords.map((item, index) => ({
      キーワード: item.keyword,
      検索数: item.count,
      順位: index + 1,
    }))
    const dateStr =
      selectedDate || `${dateRange.startDate}_${dateRange.endDate}`
    exportToCSV(csvData, `popular-keywords-${dateStr}.csv`)
  }

  const handleExportZeroResults = () => {
    const csvData = zeroResultKeywords.map((keyword) => ({
      キーワード: keyword,
    }))
    exportToCSV(csvData, 'zero-result-keywords.csv')
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">検索アナリティクス</h1>

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
          <h2 className="mb-4 font-semibold text-xl">検索ボリューム</h2>
          <div className="mb-4 rounded-lg bg-blue-50 p-4">
            <p className="text-gray-600 text-sm">総検索数</p>
            <div className="flex items-baseline gap-2">
              <p className="font-bold text-2xl text-blue-600">
                {totalSearches}
              </p>
              {comparisonEnabled && previousTotalSearches > 0 && (
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
          <SearchVolumeChart
            data={searchVolume}
            onDateClick={handleDateClick}
          />
          {selectedDate && (
            <p className="mt-2 text-center text-gray-600 text-sm">
              選択された日付: {selectedDate}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">検索結果ゼロのキーワード</h2>
            <button
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
              onClick={handleExportZeroResults}
              type="button"
            >
              CSV エクスポート
            </button>
          </div>
          <p className="mb-4 text-gray-600 text-sm">
            ユーザーが検索したものの結果が見つからなかったキーワード。コンテンツギャップを特定する機会です。
          </p>
          {zeroResultKeywords.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {zeroResultKeywords.map((keyword) => (
                <div
                  className="rounded border border-gray-200 bg-gray-50 px-3 py-2"
                  key={keyword}
                >
                  <code className="text-sm">{keyword}</code>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">データがありません</p>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-xl">
              人気キーワードランキング
              {selectedDate ? (
                <span className="ml-2 text-blue-600 text-sm">
                  ({selectedDate})
                </span>
              ) : (
                <span className="ml-2 text-green-600 text-sm">
                  ({dateRange.startDate}〜{dateRange.endDate})
                </span>
              )}
            </h2>
            <button
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm transition-colors hover:bg-gray-50"
              onClick={handleExportKeywords}
              type="button"
            >
              CSV エクスポート
            </button>
          </div>
          <p className="mb-4 text-gray-600 text-sm">
            {selectedDate
              ? `${selectedDate}に検索されたキーワードのランキング。同じ日付をもう一度クリックすると期間全体の表示に戻ります。`
              : `${dateRange.startDate}から${dateRange.endDate}の期間で最も検索されたキーワードのランキング。グラフの日付をクリックすると、その日のランキングが表示されます。`}
          </p>
          {popularKeywords.length > 0 ? (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {popularKeywords.map((item, index) => (
                <div
                  className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                  key={item.keyword}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 text-sm">
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.keyword}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-900">{item.count}</p>
                    <p className="text-gray-500 text-xs">回</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-gray-500">データがありません</p>
          )}
        </div>
      </div>
    </div>
  )
}
