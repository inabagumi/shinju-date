import { Suspense } from 'react'
import { LastSyncTimestamp } from './last-sync-timestamp'
import { NavigationBar } from './navigation-bar'

function SyncLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-slate-300 text-sm">最終同期: {children}</span>
}

export async function Header() {
  return (
    <div>
      <NavigationBar />
      <div className="bg-slate-700 px-4 py-1 text-right">
        <Suspense fallback={<SyncLabel>読込中...</SyncLabel>}>
          <LastSyncTimestamp />
        </Suspense>
      </div>
    </div>
  )
}
