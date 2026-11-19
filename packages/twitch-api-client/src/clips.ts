import { lookupByIds, requestInBatches } from "./batches.js";
import type { BatchOptions } from "./batches.js";
import { getTwitchApiClient } from "./client.js";
import type { ClientOptions } from "./client.js";
import { mapClip } from "./mappers.js";
import type { TwitchClip } from "./types.js";

interface GetClipsOptions extends ClientOptions, BatchOptions {
  ids: string[];
}

/**
 * Gets Twitch clips by ID (slug).
 * IDs that no longer exist are omitted.
 *
 * @yields {TwitchClip} The clips that still exist
 */
export const getClips = async function* getClips({
  client = getTwitchApiClient(),
  ids,
  schedule,
}: GetClipsOptions): AsyncGenerator<TwitchClip, void, undefined> {
  for await (const clip of requestInBatches(ids, schedule, (batch, run) =>
    lookupByIds(batch, (batchIds) =>
      run(() => client.clips.getClipsByIds(batchIds))
    )
  )) {
    yield mapClip(clip);
  }
};
