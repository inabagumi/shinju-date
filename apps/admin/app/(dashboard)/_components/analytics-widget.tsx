import { Panel } from '@/components/panel'
import { getAnalyticsSummary } from '../_lib/get-analytics-summary'
import { StatTileLink } from './trend-indicator'

/**
 * AnalyticsWidget - Displays analytics summary with links to detailed pages and trend indicators
 * This is an async Server Component that fetches its own data
 */
export async function AnalyticsWidget() {
  const analytics = await getAnalyticsSummary()

  return (
    <Panel title="アナリティクス">
      <div className="grid grid-cols-2 gap-4">
        <StatTileLink
          dayChange={analytics.recentSearches.dayChange}
          href="/analytics/search"
          label="本日の検索数"
          value={analytics.recentSearches.current}
        />
        <StatTileLink
          dayChange={analytics.recentClicks.dayChange}
          href="/analytics/click"
          label="本日のクリック数"
          value={analytics.recentClicks.current}
        />
        <StatTileLink
          className="col-span-2"
          dayChange={analytics.totalPopularKeywords.dayChange}
          href="/analytics/search"
          label="人気キーワード数"
          value={analytics.totalPopularKeywords.current}
        />
      </div>
    </Panel>
  )
}
