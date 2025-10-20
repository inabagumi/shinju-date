import { Suspense } from 'react'
import { LastSyncTimestamp } from './last-sync-timestamp'
import { NavigationBar } from './navigation-bar'

export async function Header() {
  return (
    <div>
      <NavigationBar />
      <div className="bg-slate-700 px-4 py-1">
        <Suspense
          fallback={
            <span className="text-slate-300 text-sm">最終同期: 読込中...</span>
          }
        >
          <LastSyncTimestamp />
        </Suspense>
      </div>
    </div>
  )
}
