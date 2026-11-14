import { toDBString } from '@shinju-date/temporal-fns'
import { countChanges } from '../internal/concurrency.js'
import {
  type ActiveYouTubeChannel,
  findSavedYouTubeVideoIds,
  getActiveYouTubeChannels,
  insertVideo,
} from '../internal/database/index.js'
import {
  createThumbnail,
  removeThumbnail,
  type Thumbnail,
} from '../internal/thumbnails/index.js'
import type { CrawlContext, WriteContext } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import type { YouTubeVideo } from './types.js'
import { getThumbnailSource, toVideoFields } from './video.js'

/** Videos saved at once; each one downloads and resizes a thumbnail. */
const SAVE_CONCURRENCY = 8

async function createVideoThumbnail(
  { now, reportError, supabaseClient }: WriteContext,
  video: YouTubeVideo,
): Promise<Thumbnail | null> {
  const source = getThumbnailSource(video)

  if (!source) {
    return null
  }

  try {
    return await createThumbnail({
      folder: video.id,
      now,
      source,
      supabaseClient,
    })
  } catch (error) {
    // A video without a thumbnail is still worth listing.
    reportError(error, { youtubeVideoId: video.id })

    return null
  }
}

/**
 * @returns Whether the video was saved (`false` when another run saved it first).
 */
async function saveVideo(
  context: WriteContext,
  channel: ActiveYouTubeChannel,
  video: YouTubeVideo,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const thumbnail = await createVideoThumbnail(context, video)
  const timestamp = toDBString(now)

  try {
    const videoId = await insertVideo(
      supabaseClient,
      {
        ...toVideoFields(video, now),
        created_at: timestamp,
        platform: 'youtube',
        talent_id: channel.talentId,
        thumbnail_id: thumbnail?.id ?? null,
        updated_at: timestamp,
        visible: true,
      },
      {
        platform: 'youtube',
        values: {
          youtube_channel_id: channel.id,
          youtube_video_id: video.id,
        },
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

/**
 * Adds videos that appeared on the channels of active talents.
 *
 * Only the newest uploads of each channel are inspected, and video details are
 * requested just for the IDs that are not saved yet, so a run that finds
 * nothing new costs one cheap request per channel. Existing videos are never
 * touched here.
 *
 * @returns The number of videos added.
 */
export async function addNewYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const channels = await getActiveYouTubeChannels(supabaseClient)

  if (channels.length === 0) {
    return 0
  }

  const { accounts, failures, missingAccountIds } =
    await fetcher.getRecentVideoIds(
      channels.map((channel) => channel.youtubeChannelId),
    )

  for (const { accountId, error } of failures) {
    reportError(error, { youtubeChannelId: accountId })
  }

  if (missingAccountIds.length > 0) {
    logger.warn('YouTubeでチャンネルが見つかりませんでした', {
      channelIds: missingAccountIds.join(','),
    })
  }

  const channelById = new Map(
    channels.map((channel) => [channel.youtubeChannelId, channel]),
  )
  const channelByVideoId = new Map<string, ActiveYouTubeChannel>()

  for (const { accountId, videoIds } of accounts) {
    const channel = channelById.get(accountId)

    if (!channel) {
      continue
    }

    for (const videoId of videoIds) {
      channelByVideoId.set(videoId, channel)
    }
  }

  const savedIds = await findSavedYouTubeVideoIds(supabaseClient, [
    ...channelByVideoId.keys(),
  ])
  const newIds = [...channelByVideoId.keys()].filter((id) => !savedIds.has(id))

  if (newIds.length === 0) {
    return 0
  }

  const { videos } = await fetcher.getVideos(newIds)

  return countChanges(
    videos,
    SAVE_CONCURRENCY,
    async (video) => {
      const channel = channelByVideoId.get(video.id)

      if (!channel || !(await saveVideo(context, channel, video))) {
        return false
      }

      logger.info('動画を追加しました', {
        duration: video.contentDetails.duration ?? 'P0D',
        platform: 'youtube',
        title: video.snippet.title ?? '',
        youtubeVideoId: video.id,
      })

      return true
    },
    (error, video) => reportError(error, { youtubeVideoId: video.id }),
  )
}
