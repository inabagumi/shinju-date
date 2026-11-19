import { Suspense } from "react";

import { LastSyncTimestamp, SyncSkeleton } from "./last-sync-timestamp";
import { NavigationBar } from "./navigation-bar";

export const Header = () => (
  <NavigationBar
    lastSync={
      <Suspense fallback={<SyncSkeleton />}>
        <LastSyncTimestamp />
      </Suspense>
    }
  />
);
