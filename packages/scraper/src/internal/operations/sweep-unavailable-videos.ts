import type { WriteContext } from "../../types.js";
import { SWEEP_PAGE_SIZE } from "../constants.js";
import { paginateById } from "../database/index.js";
import { DatabaseError } from "../errors.js";
import type { PlatformAdapter, SavedVideoBase } from "../platform.js";
import { deleteMissingVideos } from "./delete-missing-videos.js";

const getSweepPage = async <TVideo, TSaved extends SavedVideoBase>(
  { supabaseClient }: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  cursor: string | undefined
): Promise<TSaved[]> => {
  let query = supabaseClient
    .from("videos")
    // The talent is embedded only to filter on whether it was deleted.
    .select(`${adapter.savedVideoColumns}, talent:talents!inner(id)`)
    .eq("platform", adapter.platform)
    .is("deleted_at", null)
    .is("talent.deleted_at", null)
    .order("id", { ascending: true })
    .limit(SWEEP_PAGE_SIZE);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(
      `Failed to load ${adapter.platform} videos to sweep`,
      error
    );
  }

  // `savedVideoColumns` is a plain string here, so the rows cannot be typed
  // from it; the adapter guarantees they are `TSaved`.
  return data as unknown as TSaved[];
};

/**
 * Checks every saved video of non-deleted talents (retired ones included),
 * one page at a time, and soft-deletes those the platform no longer returns.
 * Details are not refreshed.
 *
 * @returns The number of videos deleted.
 */
export const sweepUnavailableVideos = async <
  TVideo,
  TSaved extends SavedVideoBase,
>(
  context: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>
): Promise<number> => {
  let deletedCount = 0;

  for await (const page of paginateById((cursor) =>
    getSweepPage(context, adapter, cursor)
  )) {
    const missingIds = adapter.findMissing
      ? await adapter.findMissing(page)
      : (await adapter.lookUp(page)).missingIds;

    deletedCount += await deleteMissingVideos(
      context,
      adapter,
      missingIds,
      page
    );
  }

  return deletedCount;
};
