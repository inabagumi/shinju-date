import { Suspense } from 'react'
import { CardSkeleton } from '@/components/skeletons'
import { AnalyticsWidget } from './_components/analytics-widget'
import { MaintenanceModeWidget } from './_components/maintenance-mode-widget'
import {
  PopularVideosWidget,
  PopularVideosWidgetSkeleton,
} from './_components/popular-videos-widget'
import { QuickAccessWidget } from './_components/quick-access-widget'
import { RecentActivity } from './_components/recent-activity'
import { SummaryWidget } from './_components/summary-widget'
import { getMaintenanceModeStatus } from './_lib/maintenance-mode-actions'

export default async function DashboardPage() {
  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">ダッシュボード</h1>

      {/* New layout: Left sidebar + Main content area */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Left Sidebar - Quick Access and Maintenance Mode */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <QuickAccessWidget />
          <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
        </aside>

        {/* Main Content Area */}
        <main className="space-y-6">
          {/* Top row: Summary and Analytics widgets */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Summary Widgets - Video and Content Summary (2 columns) */}
            <Suspense fallback={<CardSkeleton />}>
              <SummaryWidget />
            </Suspense>

            {/* Analytics Summary Widget (1 column) */}
            <Suspense fallback={<CardSkeleton />}>
              <AnalyticsWidget />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Bottom row: Popular Videos - Full width including Quick Access area */}
      <div className="mt-6">
        <Suspense fallback={<PopularVideosWidgetSkeleton />}>
          <PopularVideosWidget />
        </Suspense>
      </div>

      {/* Recent Activity Widget */}
      <div className="mt-6">
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  )
}
