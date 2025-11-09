import { cacheLife } from 'next/cache'
import { getMaintenanceModeStatus } from '../_lib/maintenance-mode-actions'
import { MaintenanceModeWidget } from './maintenance-mode-widget'

export async function MaintenanceModeWidgetWrapper() {
  'use cache: private'
  cacheLife('minutes')

  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
}
