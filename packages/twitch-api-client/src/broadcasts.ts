// What a broadcast looks like on Twitch, shared by the crawler and the admin
// app so both read a stream's state the same way.

import type { Enums } from "@shinju-date/database";

import { TWITCH_API_MAX_RESULTS } from "./batches.js";
import type { ClientOptions } from "./client.js";
import { getStreamsByUserIds } from "./streams.js";
import type { TwitchStream, TwitchVideo } from "./types.js";
import { getVideosByUser } from "./videos.js";

/** The `videos.status` a finished Twitch video or clip is shown with. */
export type TwitchVideoStatus = "ENDED" | "PUBLISHED";

interface GetBroadcastOptions extends ClientOptions {
  /** Helix stream ID of the broadcast. */
  streamId: string;
  /** Helix user ID of the broadcaster. */
  userId: string;
}

/**
 * Archives and highlights are past broadcasts; uploads and clips are regular
 * videos.
 */
export function getTwitchVideoStatus(
  type: Enums<"twitch_video_type">
): TwitchVideoStatus {
  return type === "upload" || type === "clip" ? "PUBLISHED" : "ENDED";
}

/**
 * The ID of the stream a video is the archive of, or `null` for any other
 * video.
 *
 * Twitch creates the archive as soon as a broadcast starts, so it may exist
 * while the stream is still on air: an archive alone does not mean the
 * broadcast ended.
 */
export function getArchivedStreamId(video: TwitchVideo): string | null {
  return video.type === "archive" && video.stream_id ? video.stream_id : null;
}

/**
 * Gets the stream of a broadcast while it is on air.
 *
 * @returns `null` once the broadcast is offline.
 */
export async function getLiveStream({
  client,
  streamId,
  userId,
}: GetBroadcastOptions): Promise<TwitchStream | null> {
  for await (const stream of getStreamsByUserIds({
    client,
    userIds: [userId],
  })) {
    if (stream.id === streamId) {
      return stream;
    }
  }

  return null;
}

/**
 * Finds the archive (VOD) of a broadcast among the broadcaster's newest
 * archives.
 *
 * @returns `null` when Twitch keeps no archive of it (VODs disabled, expired
 *   or deleted) or it is older than the newest {@link TWITCH_API_MAX_RESULTS}.
 */
export async function getArchiveOfStream({
  client,
  streamId,
  userId,
}: GetBroadcastOptions): Promise<TwitchVideo | null> {
  for await (const video of getVideosByUser({
    client,
    limit: TWITCH_API_MAX_RESULTS,
    type: "archive",
    userId,
  })) {
    if (getArchivedStreamId(video) === streamId) {
      return video;
    }
  }

  return null;
}
