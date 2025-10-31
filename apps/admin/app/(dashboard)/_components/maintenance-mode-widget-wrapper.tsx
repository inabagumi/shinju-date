import { getMaintenanceModeStatus } from '../_lib/maintenance-mode-actions'
import { MaintenanceModeWidget } from './maintenance-mode-widget'

export async function MaintenanceModeWidgetWrapper() {
  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
}
