import { Suspense } from 'react'
import { LastSyncTimestamp, SyncSkeleton } from './last-sync-timestamp'
import { NavigationBar } from './navigation-bar'

export async function Header() {
  return (
    <div>
      <NavigationBar />
      <div className="bg-slate-700 px-4 py-1 text-right">
        <Suspense fallback={<SyncSkeleton />}>
          <LastSyncTimestamp />
        </Suspense>
      </div>
    </div>
  )
}
