import { chunk } from "@shinju-date/helpers";

import type { RequestScheduler } from "./types.js";

export const YOUTUBE_DATA_API_MAX_RESULTS = 50;

export interface BatchOptions {
  /**
   * Runs each request for a batch of IDs. When given, every batch is handed
   * to it at once and it decides how many run at a time; otherwise the
   * batches are requested one after another.
   */
  schedule?: RequestScheduler | undefined;
}

/**
 * Requests `ids` in batches of {@link YOUTUBE_DATA_API_MAX_RESULTS}, the most
 * one request accepts, and yields what each batch returned in the order of
 * the batches.
 *
 * @param ids - The IDs to request
 * @param schedule - Runs the request of each batch, or `undefined` to
 *   request the batches one after another
 * @param request - Requests one batch of IDs
 * @yields {T} What each batch returned, in the order of the batches
 */
export const requestInBatches = async function* requestInBatches<T>(
  ids: readonly string[],
  schedule: RequestScheduler | undefined,
  request: (ids: string[]) => Promise<readonly T[]>
): AsyncGenerator<T, void, undefined> {
  const batches = chunk(ids, YOUTUBE_DATA_API_MAX_RESULTS);

  if (!schedule) {
    for (const batch of batches) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- without a scheduler, the batches are requested one after another to stay within the quota and rate limits
      yield* await request(batch);
    }

    return;
  }

  const results = await Promise.all(
    batches.map((batch) => schedule(() => request(batch)))
  );

  for (const items of results) {
    yield* items;
  }
};
