/**
 * Writes made at once by the crawls (accounts, videos and broadcasts). Saving
 * a video also downloads and resizes its thumbnail.
 */
export const WRITE_CONCURRENCY = 8;

/**
 * Videos a backfill saves at once. Lower than the discovery of new videos:
 * a backfill is not urgent, and every video downloads and resizes a
 * thumbnail.
 */
export const BACKFILL_SAVE_CONCURRENCY = 4;

/** How many of the newest finished videos a refresh re-reads. */
export const RECENT_VIDEO_COUNT = 100;

/** Page size of the full sweep; PostgREST caps responses at 1000 rows. */
export const SWEEP_PAGE_SIZE = 1000;

/** Keeps `in.(...)` filters comfortably below URL length limits. */
export const IN_FILTER_CHUNK_SIZE = 100;

/**
 * Videos soft-deleted with one `soft_delete_videos` call. The IDs are sent in
 * the request body, so the URL length does not limit them.
 */
export const SOFT_DELETE_CHUNK_SIZE = 1000;
