import { TIME_ZONE } from '@shinju-date/constants'
import { formatDateTime } from '@shinju-date/temporal-fns'
import { Skeleton } from '@shinju-date/ui'
import { getLastVideoSync } from '@/lib/get-last-sync'

export function SyncLabel({ children }: { children: React.ReactNode }) {
  return <span>最終同期: {children}</span>
}

function SyncSkeleton() {
  return (
    <SyncLabel>
      <Skeleton className="inline-block h-3 w-28 bg-primary-foreground/20 align-middle" />
    </SyncLabel>
  )
}

export { SyncSkeleton }

export async function LastSyncTimestamp() {
  const lastSync = await getLastVideoSync()

  if (!lastSync) {
    return <SyncLabel>N/A</SyncLabel>
  }

  const formatted = formatDateTime(
    Temporal.Instant.from(lastSync).toZonedDateTimeISO(TIME_ZONE),
  )
  return <SyncLabel>{formatted}</SyncLabel>
}
