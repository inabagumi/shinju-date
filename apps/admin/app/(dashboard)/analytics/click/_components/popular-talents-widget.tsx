import Link from 'next/link'
import { cache } from 'react'
import {
  getPopularTalents,
  type PopularTalent,
} from '@/lib/analytics/get-popular-talents'
import { ExportMenu } from '../../_components/export-menu'
import { RankingTable } from '../../_components/ranking-table'
import { WidgetHeader } from '../../_components/widget-header'
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
      <WidgetHeader
        actions={
          <ExportMenu
            dateRange={dateRange}
            selectedDate={selectedDate}
            type="talents"
          />
        }
        dateRange={dateRange}
        description="最もクリックされているタレントのランキング。どのタレントが人気かを把握できます。"
        selectedDate={selectedDate}
        title="人気タレントランキング"
      />
      <RankingTable
        items={talents.map((talent) => ({
          key: talent.id,
          label: (
            <Link
              className="text-accent hover:underline"
              href={`/talents/${talent.id}`}
            >
              {talent.name}
            </Link>
          ),
          value: talent.clicks,
        }))}
        labelHeading="タレント"
        valueHeading="クリック数"
      />
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
