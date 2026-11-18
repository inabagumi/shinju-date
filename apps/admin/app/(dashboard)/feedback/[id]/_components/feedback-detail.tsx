import type { Tables } from "@shinju-date/database";
import { Skeleton } from "@shinju-date/ui";

import { Markdown } from "@/components/markdown";
import { Panel, PanelSkeleton } from "@/components/panel";
import { formatDateTimeFromISO } from "@/lib/format";

import { FeedbackMemoForm } from "./feedback-memo-form";
import { FeedbackReadToggle } from "./feedback-read-toggle";
import { FeedbackStatusForm } from "./feedback-status-form";

interface FeatureRequestDetailProps {
  featureRequest: Tables<"feature_requests">;
}

/**
 * 機能要望の詳細。本文・管理メモのプレビュー・日時はサーバーで描き、
 * 操作（ステータスの変更、メモの保存、既読と未読の切り替え）だけをクライアントの部品にする
 */
export const FeatureRequestDetail = ({
  featureRequest,
}: FeatureRequestDetailProps) => {
  const createdAtFormatted = formatDateTimeFromISO(featureRequest.created_at);
  const updatedAtFormatted = formatDateTimeFromISO(featureRequest.updated_at);

  return (
    <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
      <div className="space-y-6 lg:col-span-2">
        {/* Message */}
        <Panel title="機能要望内容">
          <Markdown>{featureRequest.message}</Markdown>
        </Panel>

        {/* Admin Memo */}
        <Panel title="管理メモ">
          <FeedbackMemoForm
            adminMemo={featureRequest.admin_memo}
            id={featureRequest.id}
          />

          {/* Preview */}
          {featureRequest.admin_memo && (
            <div className="mt-6 border-t border-border pt-6">
              <h3 className="mb-2 text-body leading-normal font-semibold">
                プレビュー
              </h3>
              <Markdown>{featureRequest.admin_memo}</Markdown>
            </div>
          )}
        </Panel>
      </div>

      <div className="space-y-6">
        {/* Basic Information */}
        <Panel title="基本情報">
          <dl className="space-y-3">
            <div>
              <dt className="text-meta text-muted">送信日時</dt>
              <dd className="mt-1 tabular-nums">{createdAtFormatted}</dd>
            </div>
            <div>
              <dt className="text-meta text-muted">更新日時</dt>
              <dd className="mt-1 tabular-nums">{updatedAtFormatted}</dd>
            </div>
          </dl>
        </Panel>

        {/* Status */}
        <Panel title="ステータス管理">
          <FeedbackStatusForm
            id={featureRequest.id}
            status={featureRequest.status}
          />
        </Panel>

        {/* Read Status */}
        <Panel title="既読管理">
          <FeedbackReadToggle
            id={featureRequest.id}
            isRead={featureRequest.is_read}
          />
        </Panel>
      </div>
    </div>
  );
};

/**
 * 読み込み中の `FeatureRequestDetail`。広い画面では、本文（左の2列）に内容と管理メモ、
 * 操作（右の1列）に基本情報・ステータス管理・既読管理を並べる
 */
export const FeatureRequestDetailSkeleton = () => (
  <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
    <div className="space-y-6 lg:col-span-2">
      <PanelSkeleton title="機能要望内容">
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </PanelSkeleton>

      <PanelSkeleton title="管理メモ">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-52 w-full" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </PanelSkeleton>
    </div>

    <div className="space-y-6">
      <PanelSkeleton title="基本情報">
        <div className="space-y-3">
          {["created_at", "updated_at"].map((item) => (
            <div className="space-y-1" key={item}>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-6 w-40" />
            </div>
          ))}
        </div>
      </PanelSkeleton>

      <PanelSkeleton title="ステータス管理">
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
      </PanelSkeleton>

      <PanelSkeleton title="既読管理">
        <div className="space-y-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </PanelSkeleton>
    </div>
  </div>
);
