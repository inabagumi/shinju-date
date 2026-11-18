import { range } from "@shinju-date/helpers";
import { Alert, EmptyState, PageHeader, Skeleton } from "@shinju-date/ui";
import { Video } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BackLink } from "@/components/back-link";
import {
  DetailList,
  DetailListSkeleton,
  DetailRow,
  Panel,
  PanelSkeleton,
} from "@/components/panel";
import { VideoStatusBadge } from "@/components/video-status-badge";
import { VideoThumbnail } from "@/components/video-thumbnail";
import { WidgetErrorBoundary } from "@/components/widget-error-boundary";
import { formatDateTimeFromISO } from "@/lib/format";

import { TalentStatusBadge } from "../_components/talent-status-badge";
import { getRecentVideosForTalent } from "../_lib/get-recent-videos";
import { getTalent } from "../_lib/get-talent";
import { getVideoBackfillStatus } from "../_lib/get-video-backfill-status";
import { ChannelManager } from "./_components/channel-manager";
import { EditTalentForm } from "./_components/edit-talent-form";
import { SyncTalentButton } from "./_components/sync-talent-button";
import { TalentLifecycleActions } from "./_components/talent-lifecycle-actions";
import { TwitchUserManager } from "./_components/twitch-user-manager";
import {
  VideoBackfillPanel,
  VideoBackfillPanelSkeleton,
} from "./_components/video-backfill-panel";

export async function generateMetadata({
  params,
}: Pick<PageProps<"/talents/[id]">, "params">): Promise<Metadata> {
  const { id } = await params;

  const talent = await getTalent(id);

  if (!talent) {
    return {
      title: "タレントが見つかりません",
    };
  }

  return {
    title: `${talent.name} - タレント詳細`,
  };
}

interface VideoBackfillProps {
  talentId: string;
  talentName: string;
}

/** 過去動画の取り込みの最初の状況をサーバーで取得して、パネルに渡す */
async function VideoBackfill({ talentId, talentName }: VideoBackfillProps) {
  const initialData = await getVideoBackfillStatus(talentId);

  if (!initialData) {
    return null;
  }

  return (
    <VideoBackfillPanel
      initialData={initialData}
      talentId={talentId}
      talentName={talentName}
    />
  );
}

async function TalentProfile({
  params,
}: Pick<PageProps<"/talents/[id]">, "params">) {
  const { id } = await params;

  const talent = await getTalent(id);

  if (!talent) {
    notFound();
  }

  const isDeleted = talent.deleted_at !== null;
  const isRetired = !isDeleted && talent.status === "retired";

  return (
    <>
      <PageHeader
        actions={
          !isDeleted && (
            <SyncTalentButton
              hasTwitchUsers={talent.twitch_users.length > 0}
              hasYouTubeChannels={talent.youtube_channels.length > 0}
              talentId={talent.id}
            />
          )
        }
        description={
          <div className="flex flex-wrap items-center gap-2">
            <TalentStatusBadge talent={talent} />
            <span>タレント詳細</span>
          </div>
        }
        title={talent.name}
      />

      <div className="space-y-6">
        {/* Status indicator */}
        {isDeleted && (
          <Alert
            action={<TalentLifecycleActions talent={talent} />}
            title="削除されたタレント"
            tone="danger"
          >
            このタレントは削除されています。復活すると動画の復旧も行われます。
          </Alert>
        )}

        {isRetired && (
          <Alert title="引退したタレント" tone="warning">
            このタレントは引退状態です。
          </Alert>
        )}

        {/* Talent information - Editable form */}
        {isDeleted ? (
          <Panel
            description="削除済みのため編集できません。"
            title="タレント情報"
          >
            <DetailList>
              <DetailRow label="タレント名">{talent.name}</DetailRow>
              <DetailRow label="読み仮名">
                {talent.reading ?? (
                  <span className="text-muted">設定されていません</span>
                )}
              </DetailRow>
            </DetailList>
          </Panel>
        ) : (
          <EditTalentForm talent={talent} />
        )}

        {/* YouTube Channel Management */}
        <ChannelManager
          accounts={talent.youtube_channels}
          isDeleted={isDeleted}
          talentId={talent.id}
        />

        {/* Twitch User Management */}
        <TwitchUserManager
          accounts={talent.twitch_users}
          isDeleted={isDeleted}
          talentId={talent.id}
        />

        {/* Backfill of past videos; its progress is read apart from the talent */}
        {!isDeleted &&
          talent.youtube_channels.length + talent.twitch_users.length > 0 && (
            <WidgetErrorBoundary title="過去動画の取り込み">
              <Suspense fallback={<VideoBackfillPanelSkeleton />}>
                <VideoBackfill talentId={talent.id} talentName={talent.name} />
              </Suspense>
            </WidgetErrorBoundary>
          )}

        {/* Additional metadata */}
        <Panel title="メタデータ">
          <DetailList>
            <DetailRow label="データベースID">
              <code className="font-mono break-all">{talent.id}</code>
            </DetailRow>
            <DetailRow label="状態">
              <TalentStatusBadge talent={talent} />
            </DetailRow>
            <DetailRow label="作成日時">
              <time className="tabular-nums" dateTime={talent.created_at}>
                {formatDateTimeFromISO(talent.created_at)}
              </time>
            </DetailRow>
            <DetailRow label="最終更新日時">
              <time className="tabular-nums" dateTime={talent.updated_at}>
                {formatDateTimeFromISO(talent.updated_at)}
              </time>
            </DetailRow>
            {isDeleted && (
              <DetailRow label="削除日時">
                {talent.deleted_at ? (
                  <time className="tabular-nums" dateTime={talent.deleted_at}>
                    {formatDateTimeFromISO(talent.deleted_at)}
                  </time>
                ) : (
                  "-"
                )}
              </DetailRow>
            )}
          </DetailList>
        </Panel>

        {/* Lifecycle changes, kept apart from routine operations such as sync */}
        {!isDeleted && (
          <Panel
            actions={<TalentLifecycleActions talent={talent} />}
            description={
              isRetired
                ? "アクティブに戻すか、タレントを削除します。削除すると紐づく動画も非公開になります。"
                : "引退にするか、タレントを削除します。削除すると紐づく動画も非公開になります。"
            }
            title="状態の変更"
          />
        )}
      </div>
    </>
  );
}

/** 「最新動画」に表示する件数 */
const RECENT_VIDEOS_LIMIT = 5;

async function RecentVideosSection({
  params,
}: Pick<PageProps<"/talents/[id]">, "params">) {
  const { id } = await params;
  const recentVideos = await getRecentVideosForTalent(id, RECENT_VIDEOS_LIMIT);

  return (
    <Panel
      className="mt-6"
      description="直近に公開された動画一覧"
      title="最新動画"
    >
      {recentVideos.length === 0 ? (
        <EmptyState
          className="-mx-6 -mb-6 border-t border-border"
          icon={<Video />}
          title="動画がありません。"
        />
      ) : (
        <ul className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
          {recentVideos.map((video) => (
            <li className="px-6 py-4" key={video.id}>
              <div className="flex items-center gap-4">
                <VideoThumbnail size="sm" thumbnail={video.thumbnail} />
                <div className="min-w-0 flex-1">
                  <Link
                    className="block truncate text-meta font-semibold text-accent hover:underline"
                    href={`/videos/${video.id}`}
                  >
                    {video.title}
                  </Link>
                  <p className="text-meta text-muted tabular-nums">
                    <time dateTime={video.published_at}>
                      {formatDateTimeFromISO(video.published_at)}
                    </time>
                  </p>
                </div>
                <div className="shrink-0">
                  <VideoStatusBadge video={video} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** 読み込み中の、YouTube チャンネルと Twitch ユーザーの管理の区画。1件ぶんの枠を置く */
interface AccountManagerSkeletonProps {
  description: string;
  title: string;
}

function AccountManagerSkeleton({
  description,
  title,
}: AccountManagerSkeletonProps) {
  return (
    <PanelSkeleton
      actions={<Skeleton className="h-9 w-40" />}
      description={description}
      title={title}
    >
      <div className="flex items-start justify-between gap-4 rounded-container border border-border p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-full max-w-sm" />
        </div>
        <Skeleton className="size-8 shrink-0" />
      </div>
    </PanelSkeleton>
  );
}

/**
 * 読み込み中の `TalentProfile`。見出しと、タレント情報・YouTube チャンネル・Twitch ユーザー・
 * 過去動画の取り込み・メタデータ・状態の変更の区画を、1列に並べる
 */
function TalentProfileSkeleton() {
  return (
    <div aria-hidden="true">
      <PageHeader
        actions={<Skeleton className="h-9 w-28" />}
        description={
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <span>タレント詳細</span>
          </div>
        }
        title={<Skeleton className="h-8 w-64 max-w-full" />}
      />

      <div className="space-y-6">
        <PanelSkeleton
          actions={<Skeleton className="h-9 w-16" />}
          description="現在データベースに保存されている情報"
          title="タレント情報"
        >
          <DetailListSkeleton rows={4} />
        </PanelSkeleton>

        <AccountManagerSkeleton
          description="タレントに紐づけられたYouTubeチャンネルの追加・削除"
          title="YouTubeチャンネル管理"
        />

        <AccountManagerSkeleton
          description="タレントに紐づけられたTwitchユーザーの追加・削除"
          title="Twitchユーザー管理"
        />

        <VideoBackfillPanelSkeleton />

        <PanelSkeleton title="メタデータ">
          <DetailListSkeleton rows={4} />
        </PanelSkeleton>

        <PanelSkeleton
          actions={
            <>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-16" />
            </>
          }
          description={
            <Skeleton className="inline-block h-4 w-96 max-w-full align-middle" />
          }
          title="状態の変更"
        />
      </div>
    </div>
  );
}

/** 読み込み中の `RecentVideosSection`。取得する件数ぶんの行を並べる */
function RecentVideosSectionSkeleton() {
  return (
    <PanelSkeleton
      className="mt-6"
      description="直近に公開された動画一覧"
      title="最新動画"
    >
      <div className="-mx-6 -mb-6 divide-y divide-border border-t border-border">
        {range(RECENT_VIDEOS_LIMIT).map((row) => (
          <div
            className="flex items-center gap-4 px-6 py-4"
            key={`recent-video-skeleton-${row}`}
          >
            <Skeleton className="aspect-video w-20 shrink-0 rounded-container" />
            <div className="min-w-0 flex-1 space-y-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-5 w-40" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </div>
        ))}
      </div>
    </PanelSkeleton>
  );
}

export default function TalentDetailPage({
  params,
}: PageProps<"/talents/[id]">) {
  return (
    <div>
      {/* Back button - static, renders immediately */}
      <div className="mb-4">
        <BackLink href="/talents">タレント一覧に戻る</BackLink>
      </div>

      {/* Talent profile section */}
      <Suspense fallback={<TalentProfileSkeleton />}>
        <TalentProfile params={params} />
      </Suspense>

      {/* Recent videos section */}
      <Suspense fallback={<RecentVideosSectionSkeleton />}>
        <RecentVideosSection params={params} />
      </Suspense>
    </div>
  );
}
