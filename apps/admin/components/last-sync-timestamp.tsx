import { formatDateTime } from '@shinju-date/temporal-fns'
import { cacheLife } from 'next/cache'
import { getLastVideoSync } from '@/lib/get-last-sync'

export function SyncLabel({ children }: { children: React.ReactNode }) {
  return <span>最終同期: {children}</span>
}

function SyncSkeleton() {
  return (
    <SyncLabel>
      <span className="inline-block h-3 w-28 animate-pulse rounded-control bg-primary-foreground/20 align-middle" />
    </SyncLabel>
  )
}

export { SyncSkeleton }

export async function LastSyncTimestamp() {
  'use cache: private'

  cacheLife('minutes')

  const lastSync = await getLastVideoSync()

  if (!lastSync) {
    return <SyncLabel>N/A</SyncLabel>
  }

  const formatted = formatDateTime(lastSync)
  return <SyncLabel>{formatted}</SyncLabel>
}
