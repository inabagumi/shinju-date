import { cacheLife } from 'next/cache'
import { getMaintenanceModeStatus } from '../_lib/maintenance-mode-actions'
import { MaintenanceModeWidget } from './maintenance-mode-widget'

export async function MaintenanceModePanel() {
  'use cache: private'

  cacheLife('minutes')

  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
}
