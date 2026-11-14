import type { Tables } from '@shinju-date/database'
import { isLiveTwitchVideoId } from '@shinju-date/twitch-api-client'
import { chunk } from '../internal/batch.js'
import { DatabaseError } from '../internal/database/index.js'
import type { TypedSupabaseClient } from '../types.js'

/** Keeps `in.(...)` filters comfortably below URL length limits. */
const IN_FILTER_CHUNK_SIZE = 100

/** A saved Twitch video: its `videos` row plus its `twitch_videos` row. */
export interface SavedTwitchVideo
  extends Pick<
    Tables<'videos'>,
    | 'deleted_at'
    | 'duration'
    | 'id'
    | 'published_at'
    | 'status'
    | 'thumbnail_id'
    | 'title'
  > {
  twitch_video: Pick<
    Tables<'twitch_videos'>,
    'id' | 'stream_id' | 'twitch_video_id' | 'type'
  >
}

/**
 * Whether the row still stands in for a broadcast whose archive is unknown,
 * i.e. its platform ID is the synthetic `live:{stream_id}`.
 */
export function isLivePlaceholder(saved: SavedTwitchVideo): boolean {
  return isLiveTwitchVideoId(saved.twitch_video.twitch_video_id)
}

/**
 * Finds saved Twitch videos by platform video ID or by stream ID.
 *
 * Soft-deleted videos are included: their `twitch_videos` rows still occupy
 * the unique platform and stream IDs, so callers must know about them.
 */
export async function findSavedTwitchVideos(
  supabaseClient: TypedSupabaseClient,
  column: 'stream_id' | 'twitch_video_id',
  values: readonly string[],
): Promise<SavedTwitchVideo[]> {
  const savedVideos: SavedTwitchVideo[] = []

  for (const ids of chunk([...new Set(values)], IN_FILTER_CHUNK_SIZE)) {
    const { data, error } = await supabaseClient
      .from('twitch_videos')
      .select(
        'id, stream_id, twitch_video_id, type, video:videos!inner(id, deleted_at, duration, published_at, status, thumbnail_id, title)',
      )
      .in(column, ids)

    if (error) {
      throw new DatabaseError('Failed to look up Twitch videos', error)
    }

    for (const { video, ...twitchVideo } of data) {
      savedVideos.push({ ...video, twitch_video: twitchVideo })
    }
  }

  return savedVideos
}

/**
 * Points a saved row at a (different) Helix video, e.g. when the archive of a
 * broadcast becomes known.
 */
export async function updateTwitchVideo(
  supabaseClient: TypedSupabaseClient,
  twitchVideoRowId: string,
  values: Pick<Tables<'twitch_videos'>, 'type'> &
    Partial<Pick<Tables<'twitch_videos'>, 'stream_id' | 'twitch_video_id'>>,
): Promise<void> {
  const { error } = await supabaseClient
    .from('twitch_videos')
    .update(values)
    .eq('id', twitchVideoRowId)

  if (error) {
    throw new DatabaseError('Failed to update a Twitch video', error)
  }
}
