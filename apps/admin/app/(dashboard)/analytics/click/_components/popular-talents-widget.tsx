import { getPopularTalents } from '@/lib/analytics/get-popular-talents'
import { RankingWidget } from '../../_components/ranking-widget'
import { resolvePeriod } from '../../_lib/resolve-period'
import type { AnalyticsSearchParams } from '../../_lib/search-params-schema'

interface Props {
  searchParams: Promise<AnalyticsSearchParams>
}

/** 最もクリックされているタレントのランキング */
export async function PopularTalentsWidget({ searchParams }: Props) {
  const { dateRange, selectedDate } = await searchParams
  const range = resolvePeriod({ dateRange, selectedDate })
  const talents = await getPopularTalents({ limit: 20, range })

  return (
    <RankingWidget
      dateRange={dateRange}
      description="最もクリックされているタレントのランキング。どのタレントが人気かを把握できます。"
      exportType="talents"
      getHref={(talent) => `/talents/${talent.id}`}
      getKey={(talent) => talent.id}
      getLabel={(talent) => talent.name}
      getValue={(talent) => talent.clicks}
      labelHeading="タレント"
      rows={talents}
      selectedDate={selectedDate}
      title="人気タレントランキング"
      valueHeading="クリック数"
    />
  )
}
