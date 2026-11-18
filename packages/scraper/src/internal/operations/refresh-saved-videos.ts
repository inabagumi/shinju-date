import type { VideoFields, WriteContext } from "../../types.js";
import { countChanges } from "../concurrency.js";
import { RECENT_VIDEO_COUNT, WRITE_CONCURRENCY } from "../constants.js";
import { updateVideo } from "../database/index.js";
import { DatabaseError } from "../errors.js";
import type { PlatformAdapter, SavedVideoBase } from "../platform.js";
import { deleteMissingVideos } from "./delete-missing-videos.js";
import { diffVideoFields } from "./diff-video-fields.js";

/**
 * Which saved videos a refresh looks at:
 * - `live`: every scheduled or live video
 * - `recent`: the newest finished videos
 */
export type RefreshScope = "live" | "recent";

export interface RefreshVideoHooks<TVideo, TSaved> {
  /**
   * Platform-only work for one video, run after the columns that changed
   * were written.
   *
   * @returns Whether it changed the saved video.
   */
  afterRefresh?: (saved: TSaved, fetched: TVideo) => Promise<boolean>;
}

export interface RefreshSavedVideosOptions<
  TVideo,
  TSaved,
> extends RefreshVideoHooks<TVideo, TSaved> {
  scope: RefreshScope;
}

/** What refreshing one saved video did. */
export interface VideoRefresh {
  /** Whether anything changed, the work of `afterRefresh` included. */
  changed: boolean;
  /** The columns that changed, with their new values. */
  changes: Partial<VideoFields>;
}

/**
 * Loads the videos a refresh looks at, for active talents only.
 */
async function getVideosToRefresh<TVideo, TSaved extends SavedVideoBase>(
  { supabaseClient }: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  scope: RefreshScope
): Promise<TSaved[]> {
  const query = supabaseClient
    .from("videos")
    // The talent is embedded only to filter on its status.
    .select(`${adapter.savedVideoColumns}, talent:talents!inner(id)`)
    .eq("platform", adapter.platform)
    .is("deleted_at", null)
    .is("talent.deleted_at", null)
    .eq("talent.status", "active")
    .order("published_at", { ascending: false });

  const { data, error } =
    scope === "recent"
      ? await query
          .in("status", ["ENDED", "PUBLISHED"])
          .limit(RECENT_VIDEO_COUNT)
      : await query.in("status", ["UPCOMING", "LIVE"]);

  if (error) {
    throw new DatabaseError(
      `Failed to load ${adapter.platform} videos to refresh`,
      error
    );
  }

  // `savedVideoColumns` is a plain string here, so the rows cannot be typed
  // from it; the adapter guarantees they are `TSaved`.
  return data as unknown as TSaved[];
}

/**
 * Writes what changed on the platform to a saved video, then runs
 * `afterRefresh`.
 */
async function applyRefresh<TVideo, TSaved extends SavedVideoBase>(
  { now, supabaseClient }: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  saved: TSaved,
  fetched: TVideo,
  { afterRefresh }: RefreshVideoHooks<TVideo, TSaved>
): Promise<VideoRefresh> {
  const changes = diffVideoFields(saved, adapter.toFields(fetched, now));
  const fieldsChanged = Object.keys(changes).length > 0;

  if (fieldsChanged) {
    await updateVideo(supabaseClient, saved.id, changes);
  }

  const hookChanged = afterRefresh ? await afterRefresh(saved, fetched) : false;

  return { changed: fieldsChanged || hookChanged, changes };
}

/**
 * Brings saved videos in line with the platform: updates what changed
 * (status, schedule, title, duration), runs `afterRefresh` for every video
 * the platform returned and soft-deletes the videos it no longer returns.
 *
 * @returns The number of videos updated or deleted.
 */
export async function refreshSavedVideos<TVideo, TSaved extends SavedVideoBase>(
  context: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  { scope, ...hooks }: RefreshSavedVideosOptions<TVideo, TSaved>
): Promise<number> {
  const { logger, reportError } = context;
  const savedVideos = await getVideosToRefresh(context, adapter, scope);

  if (savedVideos.length === 0) {
    return 0;
  }

  const savedById = new Map(
    savedVideos.map((saved) => [adapter.getPlatformVideoId(saved), saved])
  );
  const { fetchedById, missingIds } = await adapter.lookUp(savedVideos);

  const updatedCount = await countChanges(
    [...fetchedById],
    WRITE_CONCURRENCY,
    async ([id, fetched]) => {
      const saved = savedById.get(id);

      return saved
        ? (await applyRefresh(context, adapter, saved, fetched, hooks)).changed
        : false;
    },
    (error, [id]) => reportError(error, { [`${adapter.platform}VideoId`]: id })
  );

  if (updatedCount > 0) {
    logger.info("動画を更新しました", {
      count: updatedCount,
      platform: adapter.platform,
      scope,
    });
  }

  const deletedCount = await deleteMissingVideos(
    context,
    adapter,
    missingIds,
    savedVideos
  );

  return updatedCount + deletedCount;
}

/**
 * Brings one saved video in line with the platform, the same way
 * {@link refreshSavedVideos} does, whatever its status and the status of its
 * talent.
 *
 * @returns What refreshing it did, `'unavailable'` when it was soft-deleted
 *   because the platform no longer returns it, or `null` when the platform
 *   cannot be asked about it.
 */
export async function refreshSavedVideo<TVideo, TSaved extends SavedVideoBase>(
  context: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  saved: TSaved,
  hooks: RefreshVideoHooks<TVideo, TSaved> = {}
): Promise<VideoRefresh | "unavailable" | null> {
  const { fetchedById, missingIds } = await adapter.lookUp([saved]);
  const fetched = fetchedById.get(adapter.getPlatformVideoId(saved));

  if (fetched) {
    return applyRefresh(context, adapter, saved, fetched, hooks);
  }

  if (missingIds.length === 0) {
    return null;
  }

  await deleteMissingVideos(context, adapter, missingIds, [saved]);

  return "unavailable";
}
