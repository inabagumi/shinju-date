import { formatDateTimeFromISO } from '@shinju-date/temporal-fns'
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  PageHeader,
} from '@shinju-date/ui'
import { ChevronLeft, Video } from 'lucide-react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DetailCardsSkeleton, ListCardsSkeleton } from '@/components/skeletons'
import { TalentStatusBadge } from '../_components/talent-status-badge'
import { getRecentVideosForTalent } from '../_lib/get-recent-videos'
import { getTalent } from '../_lib/get-talent'
import { ChannelManager } from './_components/channel-manager'
import { DetailList, DetailRow, PanelHeading } from './_components/detail-list'
import { EditTalentForm } from './_components/edit-talent-form'
import { SyncTalentButton } from './_components/sync-talent-button'
import { TalentLifecycleActions } from './_components/talent-lifecycle-actions'
import { TwitchUserManager } from './_components/twitch-user-manager'
import { VideoBackfillPanel } from './_components/video-backfill-panel'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params

  const talent = await getTalent(id)

  if (!talent) {
    return {
      title: 'タレントが見つかりません',
    }
  }

  return {
    title: `${talent.name} - タレント詳細`,
  }
}

async function TalentProfile({ id }: { id: string }) {
  const talent = await getTalent(id)

  if (!talent) {
    notFound()
  }

  const isDeleted = talent.deleted_at !== null
  const isRetired = !isDeleted && talent.status === 'retired'

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
          <div
            className="flex flex-col gap-3 rounded-container border border-danger/30 bg-danger/10 p-4 text-danger sm:flex-row sm:items-center sm:justify-between"
            role="status"
          >
            <div className="text-meta">
              <p className="font-semibold">削除されたタレント</p>
              <p className="mt-1">
                このタレントは削除されています。復活すると動画の復旧も行われます。
              </p>
            </div>
            <TalentLifecycleActions talent={talent} />
          </div>
        )}

        {isRetired && (
          <div
            className="rounded-container border border-warning/30 bg-warning/10 p-4 text-meta text-warning"
            role="status"
          >
            <p className="font-semibold">引退したタレント</p>
            <p className="mt-1">このタレントは引退状態です。</p>
          </div>
        )}

        {/* Talent information - Editable form */}
        {!isDeleted ? (
          <EditTalentForm talent={talent} />
        ) : (
          <Card variant="elevated">
            <CardHeader className="pb-6">
              <PanelHeading
                description="削除済みのため編集できません。"
                title="タレント情報"
              />
            </CardHeader>
            <DetailList>
              <DetailRow label="タレント名">{talent.name}</DetailRow>
              <DetailRow label="読み仮名">
                {talent.reading ?? (
                  <span className="text-muted">設定されていません</span>
                )}
              </DetailRow>
            </DetailList>
          </Card>
        )}

        {/* YouTube Channel Management */}
        <ChannelManager
          channels={talent.youtube_channels}
          isDeleted={isDeleted}
          talentId={talent.id}
        />

        {/* Twitch User Management */}
        <TwitchUserManager
          isDeleted={isDeleted}
          talentId={talent.id}
          users={talent.twitch_users}
        />

        {/* Backfill of past videos */}
        {!isDeleted && (
          <VideoBackfillPanel
            hasTwitchUsers={talent.twitch_users.length > 0}
            hasYouTubeChannels={talent.youtube_channels.length > 0}
            talentId={talent.id}
            talentName={talent.name}
          />
        )}

        {/* Additional metadata */}
        <Card variant="elevated">
          <CardHeader className="pb-6">
            <PanelHeading title="メタデータ" />
          </CardHeader>
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
                  '-'
                )}
              </DetailRow>
            )}
          </DetailList>
        </Card>

        {/* Lifecycle changes, kept apart from routine operations such as sync */}
        {!isDeleted && (
          <Card variant="elevated">
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <PanelHeading
                description={
                  isRetired
                    ? 'アクティブに戻すか、タレントを削除します。削除すると紐づく動画も非公開になります。'
                    : '引退にするか、タレントを削除します。削除すると紐づく動画も非公開になります。'
                }
                title="状態の変更"
              />
              <TalentLifecycleActions talent={talent} />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}

async function RecentVideosSection({ talentId }: { talentId: string }) {
  const recentVideos = await getRecentVideosForTalent(talentId, 5)

  return (
    <Card className="mt-6" variant="elevated">
      <CardHeader className="pb-6">
        <PanelHeading description="直近に公開された動画一覧" title="最新動画" />
      </CardHeader>
      {recentVideos.length === 0 ? (
        <EmptyState
          className="border-t border-border"
          icon={<Video />}
          title="動画がありません。"
        />
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {recentVideos.map((video) => (
            <li className="px-6 py-4" key={video.id}>
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {video.thumbnail ? (
                    <div className="relative h-12 w-20">
                      <Image
                        alt=""
                        blurDataURL={video.thumbnail.blur_data_url}
                        className="rounded-control object-cover"
                        fill
                        placeholder="blur"
                        sizes="80px"
                        src={`/images/thumbnails/${video.thumbnail.id}`}
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-20 items-center justify-center rounded-control bg-muted text-caption text-muted">
                      No Image
                    </div>
                  )}
                </div>
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
                  <Badge
                    variant={
                      video.deleted_at
                        ? 'danger'
                        : video.visible
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    {video.deleted_at
                      ? '削除済み'
                      : video.visible
                        ? '公開中'
                        : '非表示'}
                  </Badge>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export default function TalentDetailPage({ params }: Props) {
  return (
    <div>
      {/* Back button - static, renders immediately */}
      <div className="mb-4">
        <Link
          className="inline-flex items-center gap-1 text-meta text-accent hover:underline"
          href="/talents"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          タレント一覧に戻る
        </Link>
      </div>

      {/* Talent profile section */}
      <Suspense fallback={<DetailCardsSkeleton />}>
        {params.then(({ id }) => (
          <TalentProfile id={id} />
        ))}
      </Suspense>

      {/* Recent videos section */}
      <Suspense fallback={<ListCardsSkeleton rows={3} />}>
        {params.then(({ id }) => (
          <RecentVideosSection talentId={id} />
        ))}
      </Suspense>
    </div>
  )
}
