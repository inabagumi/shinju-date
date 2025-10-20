import { formatDateTime } from '@shinju-date/temporal-fns'
import { getLastVideoSync } from '../_lib/get-last-sync'

function SyncLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-300 text-sm">最終同期: {children}</span>
}

export async function LastSyncTimestamp() {
  const lastSync = await getLastVideoSync()

  if (!lastSync) {
    return <SyncLabel>N/A</SyncLabel>
  }

  const formatted = formatDateTime(lastSync)
  return <SyncLabel>{formatted}</SyncLabel>
}
