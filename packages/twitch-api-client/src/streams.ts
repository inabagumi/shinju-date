import { type BatchOptions, requestInBatches } from './batches.js'
import { type ClientOptions, getTwitchApiClient } from './client.js'
import { mapStream } from './mappers.js'
import type { TwitchStream } from './types.js'

interface GetStreamsByUserIdsOptions extends ClientOptions, BatchOptions {
  userIds: string[]
}

/**
 * Gets currently live streams for the given Helix user IDs.
 * Offline users are omitted from the response (same as Helix).
 */
export async function* getStreamsByUserIds({
  client = getTwitchApiClient(),
  schedule,
  userIds,
}: GetStreamsByUserIdsOptions): AsyncGenerator<TwitchStream, void, undefined> {
  if (userIds.length === 0) {
    return
  }

  for await (const stream of requestInBatches(userIds, schedule, (batch, run) =>
    run(() => client.streams.getStreamsByUserIds(batch)),
  )) {
    const mapped = mapStream(stream)
    if (mapped) {
      yield mapped
    }
  }
}
