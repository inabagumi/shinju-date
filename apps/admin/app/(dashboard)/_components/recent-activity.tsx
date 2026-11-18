import { range } from "@shinju-date/helpers";
import { EmptyState, Skeleton } from "@shinju-date/ui";

import { Panel, PanelSkeleton } from "@/components/panel";

import { getAuditLogs } from "../_lib/get-audit-logs";
import { LogItem } from "./log-item";

/** 表示する操作の件数 */
const RECENT_ACTIVITY_LIMIT = 10;

export async function RecentActivity() {
  const logs = await getAuditLogs(RECENT_ACTIVITY_LIMIT);

  return (
    <Panel title="最近のアクティビティ">
      {logs.length === 0 ? (
        <EmptyState title="最近のアクティビティはありません" />
      ) : (
        <ul className="space-y-3">
          {logs.map((log) => (
            <LogItem key={log.id} log={log} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** 読み込み中の `RecentActivity`。取得する件数ぶんの行を並べる */
export function RecentActivitySkeleton() {
  return (
    <PanelSkeleton title="最近のアクティビティ">
      <ul className="space-y-3">
        {range(RECENT_ACTIVITY_LIMIT).map((row) => (
          <li
            className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0"
            key={`recent-activity-skeleton-${row}`}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-4 w-12 shrink-0" />
          </li>
        ))}
      </ul>
    </PanelSkeleton>
  );
}
