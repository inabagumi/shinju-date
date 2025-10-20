import { formatDateTime } from '@shinju-date/temporal-fns'
import { getLastVideoSync } from '../_lib/get-last-sync'

export function SyncLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-300 text-sm">最終同期: {children}</span>
}

function SyncSkeleton() {
  return (
    <SyncLabel>
      <span className="inline-block h-4 w-32 animate-pulse rounded bg-slate-600" />
    </SyncLabel>
  )
}

export { SyncSkeleton }

export async function LastSyncTimestamp() {
  const lastSync = await getLastVideoSync()

  if (!lastSync) {
    return <SyncLabel>N/A</SyncLabel>
  }

  const formatted = formatDateTime(lastSync)
  return <SyncLabel>{formatted}</SyncLabel>
}
