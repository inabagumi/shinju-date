import { Suspense } from "react";

import { LastSyncTimestamp, SyncSkeleton } from "./last-sync-timestamp";
import { NavigationBar } from "./navigation-bar";

export function Header() {
  return (
    <NavigationBar
      lastSync={
        <Suspense fallback={<SyncSkeleton />}>
          <LastSyncTimestamp />
        </Suspense>
      }
    />
  );
}
