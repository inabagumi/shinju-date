import type { Tables } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  type ActiveTwitchUser,
  insertVideo,
} from '../internal/database/index.js'
import {
  createThumbnail,
  removeThumbnail,
  type Thumbnail,
} from '../internal/thumbnails/index.js'
import type { WriteContext } from '../types.js'
import { getThumbnailSource, type TwitchVideoFields } from './video.js'

export interface CreateTwitchThumbnailOptions {
  /** Twitch thumbnail template URL (stream preview or VOD thumbnail). */
  thumbnailUrl: string
  /** Platform video ID the image belongs to; used as the storage folder. */
  twitchVideoId: string
}

/**
 * Stores a Twitch thumbnail, or returns `null` when Twitch has none yet or it
 * cannot be stored. A video without a thumbnail is still worth listing, so
 * failures are reported instead of thrown.
 */
export async function createTwitchThumbnail(
  { now, reportError, supabaseClient }: WriteContext,
  { thumbnailUrl, twitchVideoId }: CreateTwitchThumbnailOptions,
): Promise<Thumbnail | null> {
  const source = getThumbnailSource(thumbnailUrl)

  if (!source) {
    return null
  }

  try {
    return await createThumbnail({
      folder: twitchVideoId,
      now,
      source,
      supabaseClient,
    })
  } catch (error) {
    reportError(error, { twitchVideoId })

    return null
  }
}

export interface SaveTwitchVideoOptions {
  fields: TwitchVideoFields
  /** Twitch thumbnail template URL (stream preview or VOD thumbnail). */
  thumbnailUrl: string
  twitchVideo: Pick<
    Tables<'twitch_videos'>,
    'stream_id' | 'twitch_video_id' | 'type'
  >
  user: ActiveTwitchUser
}

/**
 * Inserts a Twitch video (or the placeholder of a live broadcast) with its
 * thumbnail.
 *
 * @returns Whether the video was saved (`false` when another run saved the
 *   same video or stream first).
 */
export async function saveTwitchVideo(
  context: WriteContext,
  { fields, thumbnailUrl, twitchVideo, user }: SaveTwitchVideoOptions,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const thumbnail = await createTwitchThumbnail(context, {
    thumbnailUrl,
    twitchVideoId: twitchVideo.twitch_video_id,
  })
  const timestamp = toDBString(now)

  try {
    const videoId = await insertVideo(
      supabaseClient,
      {
        ...fields,
        created_at: timestamp,
        platform: 'twitch',
        talent_id: user.talentId,
        thumbnail_id: thumbnail?.id ?? null,
        updated_at: timestamp,
        video_kind: 'standard',
        visible: true,
      },
      {
        platform: 'twitch',
        values: { ...twitchVideo, twitch_user_id: user.id },
      },
    )

    if (videoId) {
      return true
    }
  } catch (error) {
    if (thumbnail) {
      await removeThumbnail(supabaseClient, thumbnail)
    }

    throw error
  }

  if (thumbnail) {
    await removeThumbnail(supabaseClient, thumbnail)
  }

  return false
}
