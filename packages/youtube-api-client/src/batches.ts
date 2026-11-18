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
 */
export const requestInBatches = async function* requestInBatches<T>(
  ids: readonly string[],
  schedule: RequestScheduler | undefined,
  request: (ids: string[]) => Promise<readonly T[]>
): AsyncGenerator<T, void, undefined> {
  const batches = chunk(ids, YOUTUBE_DATA_API_MAX_RESULTS);

  if (!schedule) {
    for (const batch of batches) {
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
