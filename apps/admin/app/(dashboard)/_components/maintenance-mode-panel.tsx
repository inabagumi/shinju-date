import { Skeleton } from '@shinju-date/ui'
import { PanelSkeleton } from '@/components/panel'
import { getMaintenanceModeStatus } from '../_lib/get-maintenance-mode-status'
import { MaintenanceModeWidget } from './maintenance-mode-widget'

export async function MaintenanceModePanel() {
  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
}

/** 読み込み中の `MaintenanceModePanel`。状態とスイッチの行と、注意事項の枠を並べる */
export function MaintenanceModePanelSkeleton() {
  return (
    <PanelSkeleton title="メンテナンスモード">
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
        </div>
        <Skeleton className="h-36 w-full rounded-container" />
      </div>
    </PanelSkeleton>
  )
}
