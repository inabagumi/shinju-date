import Link from 'next/link'
import { cache } from 'react'
import { Temporal } from 'temporal-polyfill'
import {
  getPopularTalents,
  type PopularTalent,
} from '@/lib/analytics/get-popular-talents'
import { ExportMenu } from '../../_components/export-menu'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/**
 * Cached function to fetch popular talents data
 */
const fetchPopularTalentsData = cache(
  async (startDate: string, endDate: string, selectedDate: string | null) => {
    if (selectedDate) {
      return getPopularTalents(20, Temporal.PlainDate.from(selectedDate))
    }

    const start = Temporal.PlainDate.from(startDate)
    const end = Temporal.PlainDate.from(endDate)
    return getPopularTalents(20, start, end)
  },
)

/**
 * Simple Popular Talents Widget Component for server rendering
 */
function SimplePopularTalentsWidget({
  talents,
  dateRange,
  selectedDate,
}: {
  talents: PopularTalent[]
  dateRange: { startDate: string; endDate: string }
  selectedDate: string | null
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-xl">
          {selectedDate
            ? `人気タレントランキング (${selectedDate})`
            : `人気タレントランキング (${dateRange.startDate} 〜 ${dateRange.endDate})`}
        </h2>
        <ExportMenu
          dateRange={dateRange}
          selectedDate={selectedDate}
          type="talents"
        />
      </div>
      <p className="mb-4 text-gray-600 text-sm">
        最もクリックされているタレントのランキング。どのタレントが人気かを把握できます。
      </p>

      {talents.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {talents.map((talent, index) => (
            <div
              className="flex items-center gap-4 rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
              key={talent.id}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 font-semibold text-purple-600 text-sm">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1 truncate">
                <Link
                  className="font-medium hover:underline"
                  href={`/talents/${talent.id}`}
                >
                  {talent.name}
                </Link>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-semibold text-gray-900">{talent.clicks}</p>
                <p className="text-gray-500 text-xs">回</p>
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

/**
 * Async server component that fetches and displays popular talents widget
 */
export async function PopularTalentsWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams

  const popularTalents = await fetchPopularTalentsData(
    dateRange.startDate,
    dateRange.endDate,
    selectedDate,
  )

  return (
    <SimplePopularTalentsWidget
      dateRange={dateRange}
      selectedDate={selectedDate}
      talents={popularTalents}
    />
  )
}
