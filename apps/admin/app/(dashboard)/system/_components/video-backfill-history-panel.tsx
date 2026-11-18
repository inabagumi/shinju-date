"use client";

import { formatNumber, range } from "@shinju-date/helpers";
import { Alert, Badge, Button, EmptyState, Skeleton } from "@shinju-date/ui";

import { AsyncPanelBody } from "@/components/async-panel-body";
import {
  BackfillAccountRow,
  BackfillAccountRowSkeleton,
} from "@/components/backfill-account-row";
import { BackfillStatusBadge } from "@/components/backfill-status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Panel, PanelSkeleton } from "@/components/panel";
import { formatDateTimeFromISO } from "@/lib/format";
import { useBackfillRequest } from "@/lib/use-backfill-request";
import { usePolledResource } from "@/lib/use-polled-resource";
import type { PolledResourceFailure } from "@/lib/use-polled-resource";

import {
  getVideoBackfillHistoryAction,
  retryFailedVideoBackfillJobsAction,
} from "../_actions/video-backfill-history";
import type {
  VideoBackfillHistory,
  VideoBackfillHistoryEntry,
} from "../_lib/get-video-backfill-history";

/**
 * How often the history is refreshed while failed accounts are retried, so
 * that their outcome shows up without reloading the page. The batch app
 * works the queue off once a minute.
 */
const POLL_INTERVAL_MS = 15_000;

const TITLE = "過去動画の取り込みの履歴";
const DESCRIPTION =
  "終了した過去動画の取り込みの結果です。最後の取り込みが失敗したアカウントは、まとめて再試行できます。";

/** 履歴を取り直す。アクションの `data` を、`usePolledResource` が受け取る形にする */
const fetchVideoBackfillHistory = async (): Promise<
  VideoBackfillHistory | PolledResourceFailure
> => {
  const result = await getVideoBackfillHistoryAction();

  if (!result.success) {
    return result;
  }

  return result.data ?? { success: false };
};

const SCOPE_LABELS: Record<VideoBackfillHistoryEntry["scope"], string> = {
  all: "全タレントのチェックで依頼",
  single: "個別に依頼",
};

interface VideoBackfillHistoryPanelProps {
  /** サーバーコンポーネントで取得した、履歴と失敗したアカウント */
  initialData: VideoBackfillHistory;
}

/**
 * 終了した過去動画の取り込み（バックフィル）の履歴を表示し、最後の取り込みが
 * 失敗したアカウントをまとめて再試行できるようにする。取り込みはバッチが非同期に行う。
 */
export const VideoBackfillHistoryPanel = ({
  initialData,
}: VideoBackfillHistoryPanelProps) => {
  const { data, error, reload } = usePolledResource({
    fetcher: fetchVideoBackfillHistory,
    initialData,
    intervalMs: POLL_INTERVAL_MS,
    isActive: ({ failures }) => failures.some((failure) => failure.active),
  });
  const retry = useBackfillRequest(retryFailedVideoBackfillJobsAction, reload);

  const { entries, failures } = data;
  const retryable = failures.filter((failure) => !failure.active).length;

  return (
    <Panel
      actions={
        <ConfirmDialog
          confirmLabel="再試行する"
          description={`最後の取り込みが失敗した ${formatNumber(retryable)}件のアカウントの過去動画の取り込みを、もう一度キューに追加しますか？\n処理はバックグラウンドで順番に行われます。`}
          onConfirm={retry}
          pendingLabel="追加中..."
          title="失敗したジョブを再試行"
          trigger={
            <Button
              className="whitespace-nowrap"
              disabled={retryable === 0}
              size="sm"
              variant="secondary"
            >
              失敗したジョブを再試行
            </Button>
          }
        />
      }
      description={DESCRIPTION}
      title={TITLE}
    >
      <AsyncPanelBody error={error} onRetry={reload}>
        {failures.length > 0 && (
          <Alert
            aria-label="最後の取り込みが失敗したアカウント"
            className="mb-4"
            role="region"
            title={
              <>
                最後の取り込みが失敗したアカウント:{" "}
                {formatNumber(failures.length)}件
                {failures.length > retryable &&
                  `（再試行中: ${formatNumber(failures.length - retryable)}件）`}
              </>
            }
            tone="danger"
          >
            <ul className="max-h-60 divide-y divide-danger/20 overflow-y-auto">
              {failures.map((failure) => (
                <BackfillAccountRow
                  aside={
                    failure.active ? (
                      <Badge variant="info">再試行中</Badge>
                    ) : (
                      <time
                        className="text-caption text-muted tabular-nums"
                        dateTime={failure.finishedAt}
                      >
                        {formatDateTimeFromISO(failure.finishedAt)}
                      </time>
                    )
                  }
                  className="px-0 py-2"
                  error={failure.error}
                  key={`${failure.provider}:${failure.accountId}`}
                  name={failure.name}
                  provider={failure.provider}
                  talent={{ id: failure.talentId, name: failure.talentName }}
                />
              ))}
            </ul>
          </Alert>
        )}
        <div className="-mx-6 -mb-6">
          {entries.length > 0 ? (
            <ul className="max-h-[32rem] divide-y divide-border overflow-y-auto border-t border-border">
              {entries.map((entry) => (
                <BackfillAccountRow
                  aside={<BackfillStatusBadge status={entry.status} />}
                  error={entry.error}
                  key={entry.id}
                  name={entry.name}
                  provider={entry.provider}
                  talent={{ id: entry.talentId, name: entry.talentName }}
                >
                  <p className="text-meta text-muted tabular-nums">
                    {formatNumber(entry.added)}件追加 ·{" "}
                    {formatNumber(entry.pages)}
                    ページ · {entry.requester ?? "不明なユーザー"}が
                    {SCOPE_LABELS[entry.scope]}
                  </p>
                  <p className="text-caption text-muted tabular-nums">
                    <time dateTime={entry.requestedAt}>
                      {formatDateTimeFromISO(entry.requestedAt)}
                    </time>
                    {" → "}
                    <time dateTime={entry.finishedAt}>
                      {formatDateTimeFromISO(entry.finishedAt)}
                    </time>
                  </p>
                </BackfillAccountRow>
              ))}
            </ul>
          ) : (
            <EmptyState
              className="pt-4"
              title="終了した過去動画の取り込みはまだありません。"
            />
          )}
        </div>
      </AsyncPanelBody>
    </Panel>
  );
};

/** スケルトンに並べる、履歴の行の数。一覧の高さ（`max-h-[32rem]`）に収まる数にする */
const SKELETON_ROWS = 6;

/** 読み込み中の `VideoBackfillHistoryPanel`。履歴の行を並べる */
export const VideoBackfillHistoryPanelSkeleton = () => (
  <PanelSkeleton
    actions={<Skeleton className="h-8 w-44" />}
    description={DESCRIPTION}
    title={TITLE}
  >
    <ul className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
      {range(SKELETON_ROWS).map((row) => (
        <BackfillAccountRowSkeleton key={`history-skeleton-${row}`} />
      ))}
    </ul>
  </PanelSkeleton>
);
