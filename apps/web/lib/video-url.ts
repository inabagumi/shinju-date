import { getVideoExternalUrl } from "@shinju-date/helpers";
import type {
  TwitchVideoType,
  VideoPlatform,
  VideoStatus,
} from "@shinju-date/helpers";

/** What a YouTube video needs to be linked to */
interface VideoUrlYouTubeVideo {
  youtube_video_id: string;
}

/** What a Twitch video needs to be linked to */
interface VideoUrlTwitchVideo {
  twitch_user: {
    twitch_login_name: string | null;
  };
  twitch_video_id: string;
  type: TwitchVideoType | null;
}

/**
 * The fewest columns of a video to link to it. The rows of the video cards,
 * the schedule, the calendars and the tracked clicks all have them.
 */
export interface VideoUrlSource {
  platform: VideoPlatform;
  status: VideoStatus;
  twitch_video: VideoUrlTwitchVideo | null;
  youtube_video: VideoUrlYouTubeVideo | null;
}

/**
 * The URL of a video on YouTube or Twitch, `null` when it cannot be made (the
 * video has no ID of its platform).
 */
export function getVideoUrl(video: VideoUrlSource): string | null {
  return getVideoExternalUrl({
    platform: video.platform,
    status: video.status,
    twitchLoginName: video.twitch_video?.twitch_user.twitch_login_name,
    twitchVideoId: video.twitch_video?.twitch_video_id,
    twitchVideoType: video.twitch_video?.type,
    youtubeVideoId: video.youtube_video?.youtube_video_id,
  });
}

/**
 * Whether a video can be linked to (`getVideoUrl`). The site leaves out the
 * videos that cannot, before counting them.
 */
export function hasPlatformSource(video: VideoUrlSource): boolean {
  return getVideoUrl(video) !== null;
}
