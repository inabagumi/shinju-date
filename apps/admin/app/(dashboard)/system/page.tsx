import { Suspense } from 'react'
import { CardSkeleton } from '@/components/skeletons'
import { MaintenanceModeWidgetWrapper } from '../_components/maintenance-mode-widget-wrapper'
import { RecentActivity } from '../_components/recent-activity'

export default function SystemPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 font-bold text-3xl">システム</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <MaintenanceModeWidgetWrapper />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  )
}
