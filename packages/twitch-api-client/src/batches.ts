import type { RequestScheduler } from './types.js'

export const TWITCH_API_MAX_RESULTS = 100

export interface BatchOptions {
  /**
   * Runs each Helix request. When given, every batch of IDs is requested at
   * once and it decides how many requests run at a time; otherwise the
   * batches are requested one after another.
   */
  schedule?: RequestScheduler | undefined
}

const runNow: RequestScheduler = (request) => request()

/**
 * Requests `ids` in batches of {@link TWITCH_API_MAX_RESULTS}, the most one
 * request accepts, and yields what each batch returned in the order of the
 * batches. `request` makes its Helix requests through `run`.
 */
export async function* requestInBatches<T>(
  ids: readonly string[],
  schedule: RequestScheduler | undefined,
  request: (ids: string[], run: RequestScheduler) => Promise<readonly T[]>,
): AsyncGenerator<T, void, undefined> {
  const batches: string[][] = []

  for (let i = 0; i < ids.length; i += TWITCH_API_MAX_RESULTS) {
    batches.push(ids.slice(i, i + TWITCH_API_MAX_RESULTS))
  }

  if (!schedule) {
    for (const batch of batches) {
      yield* await request(batch, runNow)
    }

    return
  }

  const results = await Promise.all(
    batches.map((batch) => request(batch, schedule)),
  )

  for (const items of results) {
    yield* items
  }
}

/**
 * Returns true when a Helix call failed with HTTP 404.
 */
function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    error.statusCode === 404
  )
}

/**
 * Looks up resources by ID, treating a Helix 404 as "these IDs are gone".
 *
 * Helix answers 404 instead of an empty list when a lookup by ID matches
 * nothing, and twurple surfaces that as an error. A failing batch is split in
 * half and retried so the IDs that still exist are returned and only the
 * missing ones are dropped.
 */
export async function lookupByIds<T>(
  ids: string[],
  lookup: (ids: string[]) => Promise<T[]>,
): Promise<T[]> {
  if (ids.length === 0) {
    return []
  }

  try {
    return await lookup(ids)
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error
    }

    if (ids.length === 1) {
      return []
    }

    const middle = Math.ceil(ids.length / 2)

    return [
      ...(await lookupByIds(ids.slice(0, middle), lookup)),
      ...(await lookupByIds(ids.slice(middle), lookup)),
    ]
  }
}
