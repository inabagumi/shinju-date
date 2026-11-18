import type { WriteContext } from "../../types.js";
import { softDeleteUnavailableVideos } from "../database/videos.js";
import type { PlatformAdapter, SavedVideoBase } from "../platform.js";

/**
 * Soft-deletes the saved videos the platform no longer returns, with their
 * thumbnails.
 *
 * @param ids - Platform video IDs the platform reported missing.
 * @param savedVideos - The saved videos that were looked up; only those whose
 *   platform video ID is in `ids` are deleted.
 * @returns The number of videos deleted.
 */
export const deleteMissingVideos = async <
  TVideo,
  TSaved extends SavedVideoBase,
>(
  { logger, now, supabaseClient }: WriteContext,
  adapter: PlatformAdapter<TVideo, TSaved>,
  ids: readonly string[],
  savedVideos: readonly TSaved[]
): Promise<number> => {
  const savedById = new Map(
    savedVideos.map((saved) => [adapter.getPlatformVideoId(saved), saved])
  );
  const missingVideos = ids
    .map((id) => savedById.get(id))
    .filter((saved) => saved !== undefined);

  if (missingVideos.length === 0) {
    return 0;
  }

  const deletedCount = await softDeleteUnavailableVideos(supabaseClient, {
    now,
    videoIds: missingVideos.map((saved) => saved.id),
  });

  logger.info("公開されなくなった動画を削除しました", {
    count: deletedCount,
    platform: adapter.platform,
    [`${adapter.platform}VideoIds`]: ids.join(","),
  });

  return deletedCount;
};
