import {
  getVideoExternalUrl,
  type TwitchVideoType,
  type VideoPlatform,
  type VideoStatus,
} from "@shinju-date/helpers";
import type { ComponentPropsWithoutRef } from "react";

/**
 * 外部のリンク先を作るのに使う動画の列。Supabase の埋め込み
 * （`youtube_video:youtube_videos`、`twitch_video:twitch_videos`）の形のまま
 * 受け取る。
 */
export interface ExternalVideo {
  platform: VideoPlatform;
  status?: VideoStatus | null | undefined;
  twitch_video?:
    | {
        twitch_user?: { twitch_login_name: string | null } | null | undefined;
        twitch_video_id: string;
        type?: TwitchVideoType | null | undefined;
      }
    | null
    | undefined;
  youtube_video?: { youtube_video_id: string } | null | undefined;
}

/**
 * 動画を YouTube や Twitch で開く URL。作れない動画（ID がない）は `null`。
 */
export function getExternalVideoUrl(video: ExternalVideo): string | null {
  return getVideoExternalUrl({
    platform: video.platform,
    status: video.status,
    twitchLoginName: video.twitch_video?.twitch_user?.twitch_login_name,
    twitchVideoId: video.twitch_video?.twitch_video_id,
    twitchVideoType: video.twitch_video?.type,
    youtubeVideoId: video.youtube_video?.youtube_video_id,
  });
}

interface ExternalVideoLinkProps extends Omit<
  ComponentPropsWithoutRef<"a">,
  "href" | "rel" | "target"
> {
  video: ExternalVideo;
}

/**
 * 動画を YouTube や Twitch の新しいタブで開くリンク。URL を作れない動画
 * （ID がない）は、リンクにせず中身だけを描く。
 */
export function ExternalVideoLink({
  children,
  video,
  ...props
}: ExternalVideoLinkProps) {
  const href = getExternalVideoUrl(video);

  if (!href) {
    return <>{children}</>;
  }

  return (
    <a href={href} rel="noopener noreferrer" target="_blank" {...props}>
      {children}
    </a>
  );
}
