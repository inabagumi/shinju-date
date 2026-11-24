import type { Enums, Tables } from "@shinju-date/database";

import type { VideoFields } from "../types.js";

export type Platform = Enums<"platform_type">;

/** The `videos` columns every saved video of a platform is loaded with. */
export interface SavedVideoBase extends Pick<
  Tables<"videos">,
  "duration" | "id" | "published_at" | "status" | "thumbnail_id" | "title"
> {
  video_kind: VideoFields["video_kind"];
}

/** What a platform returns for a list of its video IDs. */
export interface PlatformLookupResult<TVideo> {
  /** The videos the platform returned, by platform video ID. */
  fetchedById: Map<string, TVideo>;
  /** Requested IDs the platform no longer returns (deleted or private). */
  missingIds: string[];
}

/**
 * What differs between the platforms when saved videos are compared with
 * what the platform reports: how saved videos are loaded, how they are looked
 * up on the platform and how a platform video maps to {@link VideoFields}.
 *
 * @template TVideo - A video as the platform API returns it.
 * @template TSaved - A saved video as loaded with `savedVideoColumns`.
 */
export interface PlatformAdapter<TVideo, TSaved extends SavedVideoBase> {
  platform: Platform;
  /** The `select` of `videos` that loads a saved video as `TSaved`. */
  savedVideoColumns: string;
  /** The ID of the saved video on the platform. */
  getPlatformVideoId: (saved: TSaved) => string;
  /**
   * Looks up saved videos on the platform. Videos the platform cannot be
   * asked about (e.g. placeholders of Twitch broadcasts) are neither returned
   * nor reported missing.
   */
  lookUp: (
    savedVideos: readonly TSaved[]
  ) => Promise<PlatformLookupResult<TVideo>>;
  /**
   * Returns the platform video IDs of the saved videos the platform no longer
   * returns, when the platform offers a cheaper way than {@link lookUp}.
   */
  findMissing?: (savedVideos: readonly TSaved[]) => Promise<string[]>;
  /** Maps a platform video to the columns kept in line with the platform. */
  toFields: (video: TVideo, now: Temporal.Instant) => VideoFields;
}
