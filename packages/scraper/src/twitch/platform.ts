import type { Tables } from "@shinju-date/database";

import type { NewVideoAdapter } from "../internal/operations/save-video.js";
import type { PlatformAdapter } from "../internal/platform.js";
import type { TwitchFetcher } from "./fetcher.js";
import {
  isLivePlaceholder,
  SAVED_TWITCH_VIDEO_COLUMNS,
} from "./saved-video.js";
import type { SavedTwitchVideo } from "./saved-video.js";
import { createTwitchThumbnail } from "./thumbnail.js";
import type { TwitchClip, TwitchVideo } from "./types.js";
import { toClipFields, toVideoFields } from "./video.js";
import type { TwitchVideoFields, TwitchVideoType } from "./video.js";

/** What Twitch returns for a saved video: a Helix video, or a clip. */
export type TwitchLookedUpVideo = TwitchClip | TwitchVideo;

export type TwitchPlatformAdapter = PlatformAdapter<
  TwitchLookedUpVideo,
  SavedTwitchVideo
>;

/** Whether Twitch returned a clip rather than a Helix video. */
export const isTwitchClip = (video: TwitchLookedUpVideo): video is TwitchClip =>
  !("type" in video);

/** The `twitch_videos.type` of what Twitch returned. */
export const getTwitchVideoType = (
  video: TwitchLookedUpVideo
): TwitchVideoType => (isTwitchClip(video) ? "clip" : video.type);

/**
 * Describes Twitch to the operations shared by the platforms, reading the
 * platform through `fetcher`.
 *
 * Clips live behind a different Helix endpoint than videos, so they are
 * looked up separately. Placeholders of broadcasts (`live:{stream_id}`) have
 * no Helix resource at all, so they are never looked up and never reported
 * missing.
 */
export const createTwitchPlatform = (
  fetcher: TwitchFetcher
): TwitchPlatformAdapter => ({
  getPlatformVideoId: (saved) => saved.twitch_video.twitch_video_id,
  async lookUp(savedVideos) {
    const lookedUp = savedVideos.filter((saved) => !isLivePlaceholder(saved));
    const idsOf = (isClip: boolean) =>
      lookedUp
        .filter((saved) => (saved.twitch_video.type === "clip") === isClip)
        .map((saved) => saved.twitch_video.twitch_video_id);

    const [videoResult, clipResult] = await Promise.all([
      fetcher.getVideos(idsOf(false)),
      fetcher.getClips(idsOf(true)),
    ]);
    const fetched: TwitchLookedUpVideo[] = [
      ...videoResult.videos,
      ...clipResult.clips,
    ];

    return {
      fetchedById: new Map(fetched.map((video) => [video.id, video])),
      missingIds: [...videoResult.missingIds, ...clipResult.missingIds],
    };
  },
  platform: "twitch",
  savedVideoColumns: SAVED_TWITCH_VIDEO_COLUMNS,
  toFields: (video) =>
    isTwitchClip(video) ? toClipFields(video) : toVideoFields(video),
});

/** A Twitch video, or the placeholder of a live broadcast, to save. */
export interface NewTwitchVideo {
  fields: TwitchVideoFields;
  /** Twitch thumbnail template URL (stream preview or VOD thumbnail). */
  thumbnailUrl: string;
  twitchVideo: Pick<
    Tables<"twitch_videos">,
    "stream_id" | "twitch_video_id" | "type"
  >;
}

/** Describes Twitch to the saving of new videos. */
export const TWITCH_NEW_VIDEOS: NewVideoAdapter<NewTwitchVideo> = {
  createThumbnail: (context, video) =>
    createTwitchThumbnail(context, {
      thumbnailUrl: video.thumbnailUrl,
      twitchVideoId: video.twitchVideo.twitch_video_id,
    }),
  toFields: (video) => video.fields,
  toPlatformVideo: (video, user) => ({
    platform: "twitch",
    values: { ...video.twitchVideo, twitch_user_id: user.id },
  }),
};
