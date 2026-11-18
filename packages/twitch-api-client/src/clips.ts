import { type BatchOptions, lookupByIds, requestInBatches } from './batches.js'
import { type ClientOptions, getTwitchApiClient } from './client.js'
import { mapClip } from './mappers.js'
import type { TwitchClip } from './types.js'

interface GetClipsOptions extends ClientOptions, BatchOptions {
  ids: string[]
}

/**
 * Gets Twitch clips by ID (slug).
 * IDs that no longer exist are omitted.
 */
export async function* getClips({
  client = getTwitchApiClient(),
  ids,
  schedule,
}: GetClipsOptions): AsyncGenerator<TwitchClip, void, undefined> {
  for await (const clip of requestInBatches(ids, schedule, (batch, run) =>
    lookupByIds(batch, (batchIds) =>
      run(() => client.clips.getClipsByIds(batchIds)),
    ),
  )) {
    yield mapClip(clip)
  }
}
