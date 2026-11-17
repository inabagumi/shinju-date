import { getMaintenanceModeStatus } from '../_lib/get-maintenance-mode-status'
import { MaintenanceModeWidget } from './maintenance-mode-widget'

export async function MaintenanceModePanel() {
  const maintenanceModeStatus = await getMaintenanceModeStatus()
  return <MaintenanceModeWidget initialStatus={maintenanceModeStatus} />
}
