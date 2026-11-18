import { toDBString } from '@shinju-date/temporal-fns'
import type { VideoFields, WriteContext } from '../../types.js'
import {
  insertVideo,
  type NewPlatformVideo,
  type TalentAccount,
} from '../database/index.js'
import {
  createThumbnail,
  removeThumbnail,
  type Thumbnail,
  type ThumbnailSource,
} from '../thumbnails/index.js'

/**
 * What differs between the platforms when a new video is saved: how it maps
 * to its `videos` row and its platform row, and which image its thumbnail is
 * copied from.
 *
 * @typeParam TNew - A video to save, as the platform describes it.
 */
export interface NewVideoAdapter<TNew> {
  /**
   * The key the ID of a video on the platform is reported under, e.g.
   * `youtubeVideoId`.
   */
  platformVideoIdKey: string
  /**
   * The ID of the video on the platform. Its thumbnail is stored under a
   * folder of this name, so stored objects can be traced back to the video.
   */
  getPlatformVideoId(video: TNew): string
  /**
   * The image to copy as the thumbnail, or `null` when the platform has none
   * yet.
   */
  getThumbnailSource(video: TNew): ThumbnailSource | null
  /** The columns of the `videos` row kept in line with the platform. */
  toFields(video: TNew, now: Temporal.Instant): VideoFields
  /** The platform row that identifies the video on its platform. */
  toPlatformVideo(video: TNew, account: TalentAccount): NewPlatformVideo
}

/**
 * Stores the thumbnail of a new video, or returns `null` when the platform
 * has none yet or it cannot be stored. A video without a thumbnail is still
 * worth listing, and a refresh fills it in later, so failures are reported
 * instead of thrown.
 */
async function createNewVideoThumbnail<TNew>(
  { now, reportError, supabaseClient }: WriteContext,
  adapter: NewVideoAdapter<TNew>,
  video: TNew,
): Promise<Thumbnail | null> {
  const source = adapter.getThumbnailSource(video)

  if (!source) {
    return null
  }

  const platformVideoId = adapter.getPlatformVideoId(video)

  try {
    return await createThumbnail({
      folder: platformVideoId,
      now,
      source,
      supabaseClient,
    })
  } catch (error) {
    reportError(error, { [adapter.platformVideoIdKey]: platformVideoId })

    return null
  }
}

/**
 * Inserts a new video of `account` with its platform row and its thumbnail.
 *
 * The thumbnail is stored first so the video is listed with it. When the
 * video is not inserted, because another run saved it first or the insert
 * failed, the thumbnail is removed again: nothing else would ever use it.
 *
 * @returns Whether the video was saved (`false` when another run saved it
 *   first).
 * @throws When the video cannot be inserted.
 */
export async function saveVideoWithThumbnail<TNew>(
  context: WriteContext,
  adapter: NewVideoAdapter<TNew>,
  video: TNew,
  account: TalentAccount,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const thumbnail = await createNewVideoThumbnail(context, adapter, video)
  const platformVideo = adapter.toPlatformVideo(video, account)
  const timestamp = toDBString(now)
  let videoId: string | null

  try {
    videoId = await insertVideo(
      supabaseClient,
      {
        ...adapter.toFields(video, now),
        created_at: timestamp,
        platform: platformVideo.platform,
        talent_id: account.talentId,
        thumbnail_id: thumbnail?.id ?? null,
        updated_at: timestamp,
        visible: true,
      },
      platformVideo,
    )
  } catch (error) {
    if (thumbnail) {
      await removeThumbnail(context, thumbnail)
    }

    throw error
  }

  if (videoId) {
    return true
  }

  if (thumbnail) {
    await removeThumbnail(context, thumbnail)
  }

  return false
}
