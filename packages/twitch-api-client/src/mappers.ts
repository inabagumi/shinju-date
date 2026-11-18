import type {
  HelixClip,
  HelixStream,
  HelixUser,
  HelixVideo,
} from "@twurple/api";

import type {
  TwitchClip,
  TwitchStream,
  TwitchUser,
  TwitchVideo,
} from "./types.js";

// biome-ignore lint/style/noRestrictedGlobals: twurple returns timestamps as Date, so the mappers have to accept it.
function toIsoString(date: Date): string {
  return Temporal.Instant.fromEpochMilliseconds(date.getTime()).toString();
}

/**
 * Converts a duration in seconds to ISO 8601 (e.g. PT1H2M3S) via Temporal.
 * Uses twurple's durationInSeconds rather than re-parsing Twitch's "1h2m3s" strings.
 */
function durationFromSeconds(seconds: number): string {
  return Temporal.Duration.from({
    seconds: Math.max(0, Math.floor(seconds)),
  })
    .round({ largestUnit: "hour" })
    .toString();
}

export function mapUser(user: HelixUser): TwitchUser {
  return {
    broadcaster_type: user.broadcasterType,
    created_at: toIsoString(user.creationDate),
    description: user.description,
    display_name: user.displayName,
    id: user.id,
    login: user.name,
    offline_image_url: user.offlinePlaceholderUrl,
    profile_image_url: user.profilePictureUrl,
    type: user.type,
  };
}

/**
 * @returns `null` for a kind of video the database does not know
 */
export function mapVideo(video: HelixVideo): TwitchVideo | null {
  // Helix may add kinds of videos that twurple's type does not list yet.
  const type: string = video.type;

  if (type !== "archive" && type !== "highlight" && type !== "upload") {
    return null;
  }

  return {
    created_at: toIsoString(video.creationDate),
    description: video.description,
    duration: durationFromSeconds(video.durationInSeconds),
    id: video.id,
    language: video.language,
    published_at: toIsoString(video.publishDate),
    stream_id: video.streamId,
    thumbnail_url: video.thumbnailUrl,
    title: video.title,
    type,
    url: video.url,
    user_id: video.userId,
    user_login: video.userName,
    user_name: video.userDisplayName,
    view_count: video.views,
    viewable: video.isPublic ? "public" : "private",
  };
}

export function mapClip(clip: HelixClip): TwitchClip {
  return {
    broadcaster_id: clip.broadcasterId,
    broadcaster_name: clip.broadcasterDisplayName,
    created_at: toIsoString(clip.creationDate),
    creator_id: clip.creatorId,
    creator_name: clip.creatorDisplayName,
    duration: durationFromSeconds(clip.duration),
    embed_url: clip.embedUrl,
    game_id: clip.gameId,
    id: clip.id,
    language: clip.language,
    thumbnail_url: clip.thumbnailUrl,
    title: clip.title,
    url: clip.url,
    video_id: clip.videoId,
    view_count: clip.views,
    vod_offset: clip.vodOffset,
  };
}

/**
 * @returns `null` for a stream that is not live
 */
export function mapStream(stream: HelixStream): TwitchStream | null {
  // Helix currently only returns type "live" for Get Streams.
  if (stream.type !== "live") {
    return null;
  }

  return {
    game_id: stream.gameId,
    game_name: stream.gameName,
    id: stream.id,
    is_mature: stream.isMature,
    language: stream.language,
    started_at: toIsoString(stream.startDate),
    tags: stream.tags,
    thumbnail_url: stream.thumbnailUrl,
    title: stream.title,
    type: "live",
    user_id: stream.userId,
    user_login: stream.userName,
    user_name: stream.userDisplayName,
    viewer_count: stream.viewers,
  };
}
