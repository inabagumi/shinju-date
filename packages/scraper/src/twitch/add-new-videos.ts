import { getArchivedStreamId } from "@shinju-date/twitch-api-client";

import { countChanges } from "../internal/concurrency.js";
import { WRITE_CONCURRENCY } from "../internal/constants.js";
import {
  getActiveAccounts,
  TWITCH_USERS,
} from "../internal/database/talents.js";
import type { TalentAccount } from "../internal/database/talents.js";
import { saveVideoWithThumbnail } from "../internal/operations/save-video.js";
import type { CrawlContext, WriteContext } from "../types.js";
import { attachArchive } from "./attach-archive.js";
import type { TwitchFetcher } from "./fetcher.js";
import { TWITCH_NEW_VIDEOS } from "./platform.js";
import { findSavedTwitchVideos, isLivePlaceholder } from "./saved-video.js";
import type { SavedTwitchVideo } from "./saved-video.js";
import type { TwitchStream, TwitchVideo } from "./types.js";
import { toLiveFields, toVideoFields } from "./video.js";

/** What to do with a video Twitch lists for a broadcaster. */
export type NewVideoAction =
  /** Not saved yet: insert it. */
  | { kind: "insert"; liveStream: TwitchStream | undefined; video: TwitchVideo }
  /** The archive of a broadcast we already track: attach it to that row. */
  | {
      kind: "link";
      liveStream: TwitchStream | undefined;
      saved: SavedTwitchVideo;
      video: TwitchVideo;
    };

export interface PlanNewVideosOptions {
  /** Streams that are on air right now. */
  liveStreams: readonly TwitchStream[];
  /** Saved rows whose stream ID matches one of `videos`. */
  savedByStreamId: readonly SavedTwitchVideo[];
  /** Saved rows whose platform video ID matches one of `videos`. */
  savedByVideoId: readonly SavedTwitchVideo[];
  videos: readonly TwitchVideo[];
}

/**
 * Decides what to do with each listed video.
 *
 * Twitch creates the archive of a broadcast as soon as it starts, so an
 * archive can show up while its stream is still live. Such an archive must not
 * end the broadcast: `liveStream` is set on the action so the row stays LIVE.
 */
export const planNewVideos = ({
  liveStreams,
  savedByStreamId,
  savedByVideoId,
  videos,
}: PlanNewVideosOptions): NewVideoAction[] => {
  const liveStreamById = new Map(
    liveStreams.map((stream) => [stream.id, stream])
  );
  const savedVideoIds = new Set(
    savedByVideoId.map((saved) => saved.twitch_video.twitch_video_id)
  );
  const savedByStream = new Map<string, SavedTwitchVideo>();

  for (const saved of savedByStreamId) {
    if (saved.twitch_video.stream_id) {
      savedByStream.set(saved.twitch_video.stream_id, saved);
    }
  }

  const actions: NewVideoAction[] = [];
  const plannedVideoIds = new Set<string>();

  for (const video of videos) {
    if (savedVideoIds.has(video.id) || plannedVideoIds.has(video.id)) {
      continue;
    }

    plannedVideoIds.add(video.id);

    const archivedStreamId = getArchivedStreamId(video);
    const liveStream = archivedStreamId
      ? liveStreamById.get(archivedStreamId)
      : undefined;
    const saved = video.stream_id
      ? savedByStream.get(video.stream_id)
      : undefined;

    if (!saved) {
      actions.push({ kind: "insert", liveStream, video });
      continue;
    }

    // The stream ID is unique, so a row that already owns it rules out an
    // insert. Only a placeholder that is still waiting for its archive (and
    // was not deleted meanwhile) takes the video over.
    if (
      video.type === "archive" &&
      isLivePlaceholder(saved) &&
      !saved.deleted_at
    ) {
      actions.push({ kind: "link", liveStream, saved, video });
    }
  }

  return actions;
};

/**
 * Carries out one planned action. Failures are thrown, so callers decide
 * whether one failed video stops the others.
 *
 * @returns Whether the action changed what the public site shows.
 */
export const applyNewVideoAction = async (
  context: WriteContext,
  action: NewVideoAction,
  userByTwitchId: ReadonlyMap<string, TalentAccount>
): Promise<boolean> => {
  const { liveStream, video } = action;

  if (action.kind === "insert") {
    const user = userByTwitchId.get(video.user_id);

    if (!user) {
      return false;
    }

    return await saveVideoWithThumbnail(
      context,
      TWITCH_NEW_VIDEOS,
      {
        // While the broadcast is on air the row describes the stream, exactly
        // like the placeholder the live sync would have created.
        fields: liveStream ? toLiveFields(liveStream) : toVideoFields(video),
        thumbnailUrl: liveStream
          ? liveStream.thumbnail_url
          : video.thumbnail_url,
        twitchVideo: {
          stream_id: video.stream_id,
          twitch_video_id: video.id,
          type: video.type,
        },
      },
      user
    );
  }

  return await attachArchive(context, action.saved, video, {
    stillLive: liveStream !== undefined,
  });
};

/**
 * Adds videos (archives and uploads) that appeared on the Twitch accounts of
 * active talents, and attaches archives to the broadcasts the live sync
 * already tracks.
 *
 * Existing videos are never refreshed here, and the LIVE lifecycle of
 * broadcasts belongs to the live sync.
 *
 * @returns The number of videos added or attached.
 */
export const addNewTwitchVideos = async (
  context: CrawlContext<TwitchFetcher>
): Promise<number> => {
  const { fetcher, reportError, supabaseClient } = context;
  const users = await getActiveAccounts(supabaseClient, TWITCH_USERS);

  if (users.length === 0) {
    return 0;
  }

  const twitchUserIds = [...new Set(users.map((user) => user.platformId))];

  const [liveStreams, archives, uploads] = await Promise.all([
    fetcher.getLiveStreams(twitchUserIds),
    fetcher.getRecentVideos(twitchUserIds, { type: "archive" }),
    fetcher.getRecentVideos(twitchUserIds, { type: "upload" }),
  ]);

  for (const { accountId, error } of [
    ...archives.failures,
    ...uploads.failures,
  ]) {
    reportError(error, { twitchUserId: accountId });
  }

  return saveNewTwitchVideos(context, {
    liveStreams,
    users,
    videos: [...archives.videos, ...uploads.videos],
  });
};

export interface SaveNewTwitchVideosOptions {
  /** Videos saved at once (default: `WRITE_CONCURRENCY`). */
  concurrency?: number;
  /** Streams of `users` that are on air right now. */
  liveStreams: readonly TwitchStream[];
  /** Accounts the videos may belong to; videos of other accounts are skipped. */
  users: readonly TalentAccount[];
  /** Videos Twitch listed; the ones that are saved already are skipped. */
  videos: readonly TwitchVideo[];
}

/**
 * Saves the listed videos that are not saved yet, and attaches archives to the
 * broadcasts the live sync already tracks. Shared by the discovery of new
 * videos and by backfills of past ones, so both store videos the same way.
 *
 * @returns The number of videos added or attached.
 */
export const saveNewTwitchVideos = async (
  context: WriteContext,
  {
    concurrency = WRITE_CONCURRENCY,
    liveStreams,
    users,
    videos,
  }: SaveNewTwitchVideosOptions
): Promise<number> => {
  const { logger, reportError, supabaseClient } = context;

  if (videos.length === 0) {
    return 0;
  }

  const userByTwitchId = new Map(users.map((user) => [user.platformId, user]));
  const [savedByVideoId, savedByStreamId] = await Promise.all([
    findSavedTwitchVideos(
      supabaseClient,
      "twitch_video_id",
      videos.map((video) => video.id)
    ),
    findSavedTwitchVideos(
      supabaseClient,
      "stream_id",
      videos.map((video) => video.stream_id).filter((id) => id !== null)
    ),
  ]);

  const actions = planNewVideos({
    liveStreams,
    savedByStreamId,
    savedByVideoId,
    videos,
  });

  return countChanges(
    actions,
    concurrency,
    async (action) => {
      if (!(await applyNewVideoAction(context, action, userByTwitchId))) {
        return false;
      }

      logger.info("動画を追加しました", {
        duration: action.video.duration,
        platform: "twitch",
        title: action.video.title,
        twitchVideoId: action.video.id,
        type: action.video.type,
      });

      return true;
    },
    (failure, action) =>
      reportError(failure, { twitchVideoId: action.video.id })
  );
};
