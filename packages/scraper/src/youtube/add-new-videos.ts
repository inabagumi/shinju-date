import { toDBString } from '@shinju-date/temporal-fns'
import { countChanges } from '../internal/concurrency.js'
import { WRITE_CONCURRENCY } from '../internal/constants.js'
import {
  findSavedYouTubeVideoIds,
  getActiveAccounts,
  insertVideo,
  type TalentAccount,
  YOUTUBE_CHANNELS,
} from '../internal/database/index.js'
import { removeThumbnail } from '../internal/thumbnails/index.js'
import type { CrawlContext, WriteContext } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import { createYouTubeThumbnail } from './thumbnail.js'
import type { YouTubeVideo } from './types.js'
import { toVideoFields } from './video.js'

/**
 * @returns Whether the video was saved (`false` when another run saved it first).
 */
async function saveVideo(
  context: WriteContext,
  channel: TalentAccount,
  video: YouTubeVideo,
): Promise<boolean> {
  const { now, supabaseClient } = context
  const thumbnail = await createYouTubeThumbnail(context, video)
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
      await removeThumbnail(context, thumbnail)
    }

    throw error
  }

  if (thumbnail) {
    await removeThumbnail(context, thumbnail)
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
  const channels = await getActiveAccounts(supabaseClient, YOUTUBE_CHANNELS)

  if (channels.length === 0) {
    return 0
  }

  const { accounts, failures, missingAccountIds } =
    await fetcher.getRecentVideoIds(
      channels.map((channel) => channel.platformId),
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
    channels.map((channel) => [channel.platformId, channel]),
  )
  const channelByVideoId = new Map<string, TalentAccount>()

  for (const { accountId, videoIds } of accounts) {
    const channel = channelById.get(accountId)

    if (!channel) {
      continue
    }

    for (const videoId of videoIds) {
      channelByVideoId.set(videoId, channel)
    }
  }

  return saveNewYouTubeVideos(context, channelByVideoId)
}

/**
 * Saves the listed videos that are not saved yet. Details are requested only
 * for those, so a page of videos that are all saved costs no further request.
 * Shared by the discovery of new videos and by backfills of past ones, so
 * both store videos the same way.
 *
 * @param channelByVideoId - The channel each listed video ID belongs to.
 * @param concurrency - Videos saved at once.
 * @returns The number of videos added.
 */
export async function saveNewYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
  channelByVideoId: ReadonlyMap<string, TalentAccount>,
  concurrency = WRITE_CONCURRENCY,
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context
  const listedIds = [...channelByVideoId.keys()]

  if (listedIds.length === 0) {
    return 0
  }

  const savedIds = await findSavedYouTubeVideoIds(supabaseClient, listedIds)
  const newIds = listedIds.filter((id) => !savedIds.has(id))

  if (newIds.length === 0) {
    return 0
  }

  const { videos } = await fetcher.getVideos(newIds)

  return countChanges(
    videos,
    concurrency,
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
