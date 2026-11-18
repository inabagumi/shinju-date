"use client";

import { formatNumber, range } from "@shinju-date/helpers";
import { Badge, Button, EmptyState, Skeleton } from "@shinju-date/ui";

import { AsyncPanelBody } from "@/components/async-panel-body";
import {
  BackfillAccountRow,
  BackfillAccountRowSkeleton,
} from "@/components/backfill-account-row";
import {
  BACKFILL_STATUS_LABELS,
  BackfillStatusBadge,
} from "@/components/backfill-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Panel, PanelSkeleton } from "@/components/panel";
import { formatDateTimeFromISO } from "@/lib/format";
import { useBackfillRequest } from "@/lib/use-backfill-request";
import {
  type PolledResourceFailure,
  usePolledResource,
} from "@/lib/use-polled-resource";

import {
  getVideoBackfillRunAction,
  requestVideoBackfillRunAction,
} from "../_actions/video-backfill-run";
import type {
  VideoBackfillRun,
  VideoBackfillRunAccount,
  VideoBackfillRunState,
} from "../_lib/get-video-backfill-run";

type Status = VideoBackfillRunAccount["status"];

/** How often progress is refreshed while a check is in progress. */
const POLL_INTERVAL_MS = 5_000;

const TITLE = "取得漏れチェック（全タレント）";
const DESCRIPTION =
  "active なタレントのすべてのアカウントについて、プラットフォーム上にあってデータベースにない過去の動画を取り込みます。登録済みの動画はそのまま残ります。";

/** 進捗を取り直す。アクションの `data` を、`usePolledResource` が受け取る形にする */
async function fetchVideoBackfillRun(): Promise<
  VideoBackfillRunState | PolledResourceFailure
> {
  const result = await getVideoBackfillRunAction();

  if (!result.success) {
    return result;
  }

  return result.data ?? { success: false };
}

/** Order of the counts in the summary. */
const STATUSES: Status[] = [
  "pending",
  "running",
  "done",
  "failed",
  "interrupted",
];

/** Accounts that need attention come first. */
const STATUS_ORDER: Record<Status, number> = {
  done: 4,
  failed: 2,
  interrupted: 3,
  pending: 1,
  running: 0,
};

interface RunSummaryProps {
  run: VideoBackfillRun;
}

function RunSummary({ run }: RunSummaryProps) {
  const total = run.accounts.length;
  const finished = total - run.counts.pending - run.counts.running;
  const accounts = [...run.accounts].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  );

  return (
    <>
      <div className="space-y-3 px-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-meta text-muted tabular-nums">
          <p>
            <time dateTime={run.requestedAt}>
              {formatDateTimeFromISO(run.requestedAt)}
            </time>
            に依頼 · {formatNumber(total)}件
            {run.skipped > 0 && `（実行中のため除外: ${run.skipped}件）`}
            {run.failed > 0 && `（追加できなかった: ${run.failed}件）`}
          </p>
          {run.active ? (
            <Badge variant="info">実行中</Badge>
          ) : (
            <Badge variant="neutral">終了</Badge>
          )}
        </div>
        <div
          aria-label="取得漏れチェックの進捗"
          aria-valuemax={total}
          aria-valuemin={0}
          aria-valuenow={finished}
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
        >
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${total > 0 ? (finished / total) * 100 : 0}%` }}
          />
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {STATUSES.map((status) => (
            <div className="rounded-control bg-muted p-2" key={status}>
              <dt className="text-caption text-muted">
                {BACKFILL_STATUS_LABELS[status].label}
              </dt>
              <dd className="text-body font-semibold tabular-nums">
                {formatNumber(run.counts[status])}
              </dd>
            </div>
          ))}
          <div className="rounded-control bg-muted p-2">
            <dt className="text-caption text-muted">追加本数</dt>
            <dd className="text-body font-semibold tabular-nums">
              {formatNumber(run.added)}
            </dd>
          </div>
        </dl>
      </div>
      <ul className="max-h-96 divide-y divide-border overflow-y-auto border-t border-border">
        {accounts.map((account) => (
          <BackfillAccountRow
            aside={<BackfillStatusBadge status={account.status} />}
            error={account.error}
            key={`${account.provider}:${account.accountId}`}
            name={account.name}
            provider={account.provider}
            talent={{ id: account.talentId, name: account.talentName }}
          >
            <p className="text-meta text-muted tabular-nums">
              {formatNumber(account.added)}件追加
              {account.updatedAt && (
                <>
                  {" · "}
                  <time dateTime={account.updatedAt}>
                    {formatDateTimeFromISO(account.updatedAt)}
                  </time>
                </>
              )}
            </p>
          </BackfillAccountRow>
        ))}
      </ul>
    </>
  );
}

interface VideoBackfillRunPanelProps {
  /** サーバーコンポーネントで取得した、対象の件数と最新のチェックの進捗 */
  initialData: VideoBackfillRunState;
}

/**
 * 全 active タレントのアカウントについて、過去動画（プラットフォームにあって
 * DB にない動画）の取り込みをまとめてキューに追加し、その進捗を表示する。
 * 取り込みはバッチが非同期に行う。
 */
export function VideoBackfillRunPanel({
  initialData,
}: VideoBackfillRunPanelProps) {
  const { data, error, reload } = usePolledResource({
    fetcher: fetchVideoBackfillRun,
    initialData,
    intervalMs: POLL_INTERVAL_MS,
    isActive: ({ run }) => run?.active ?? false,
  });
  const request = useBackfillRequest(requestVideoBackfillRunAction, reload);

  const { run, targets } = data;
  const isActive = run?.active ?? false;
  const totalTargets = targets.youtube + targets.twitch;

  return (
    <Panel
      actions={
        <ConfirmDialog
          confirmLabel="チェックする"
          description={`active なタレントの YouTube チャンネル ${formatNumber(targets.youtube)}件と Twitch アカウント ${formatNumber(targets.twitch)}件（合計 ${formatNumber(totalTargets)}件）の過去動画をすべて確認し、未登録の動画を取り込みますか？\n処理はバックグラウンドで順番に行われ、完了までに時間がかかります。`}
          onConfirm={request}
          pendingLabel="追加中..."
          title="全タレントの取得漏れをチェック"
          trigger={
            <Button
              className="whitespace-nowrap"
              disabled={isActive || totalTargets === 0}
              size="sm"
              variant="secondary"
            >
              {isActive ? "実行中" : "取得漏れをチェックする"}
            </Button>
          }
        />
      }
      description={DESCRIPTION}
      title={TITLE}
    >
      <AsyncPanelBody error={error} onRetry={reload}>
        <div className="-mx-6 -mb-6">
          {run ? (
            <RunSummary run={run} />
          ) : (
            <EmptyState
              className="pt-4"
              title="最近の取得漏れチェックはありません。"
            />
          )}
        </div>
      </AsyncPanelBody>
    </Panel>
  );
}

/** スケルトンに並べる、アカウントの行の数 */
const SKELETON_ROWS = 3;

/** 読み込み中の `VideoBackfillRunPanel`。依頼の行、進捗の棒、件数の枠、アカウントの行を並べる */
export function VideoBackfillRunPanelSkeleton() {
  return (
    <PanelSkeleton
      actions={<Skeleton className="h-8 w-44" />}
      description={DESCRIPTION}
      title={TITLE}
    >
      <div className="-mx-6 -mb-6">
        <div className="space-y-3 px-6 pb-4">
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-2 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {range(STATUSES.length + 1).map((tile) => (
              <Skeleton className="h-14" key={`run-count-skeleton-${tile}`} />
            ))}
          </div>
        </div>
        <ul className="divide-y divide-border border-t border-border">
          {range(SKELETON_ROWS).map((row) => (
            <BackfillAccountRowSkeleton key={`run-account-skeleton-${row}`} />
          ))}
        </ul>
      </div>
    </PanelSkeleton>
  );
}
