import { Badge } from "@shinju-date/ui";
import type { BadgeProps } from "@shinju-date/ui";
import type { BackfillRunJobStatus } from "@shinju-date/video-backfill";

/**
 * 過去動画の取り込みの状態の、表示名とバッジの色。「中断」（`interrupted`）かどうかは
 * `@shinju-date/video-backfill` の `getJobActivity` が決める
 */
export const BACKFILL_STATUS_LABELS = {
  done: { label: "完了", variant: "success" },
  failed: { label: "失敗", variant: "danger" },
  interrupted: { label: "中断", variant: "warning" },
  pending: { label: "待機中", variant: "info" },
  running: { label: "取り込み中", variant: "info" },
} as const satisfies Record<
  BackfillRunJobStatus,
  { label: string; variant: BadgeProps["variant"] }
>;

interface BackfillStatusBadgeProps {
  /** `null` は、まだ取り込んでいないアカウント */
  status: BackfillRunJobStatus | null;
}

/** 過去動画の取り込みの状態を示すバッジ */
export function BackfillStatusBadge({ status }: BackfillStatusBadgeProps) {
  if (status === null) {
    return <Badge variant="neutral">未実行</Badge>;
  }

  const { label, variant } = BACKFILL_STATUS_LABELS[status];

  return <Badge variant={variant}>{label}</Badge>;
}
