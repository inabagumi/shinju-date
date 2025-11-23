import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import type { YouTubeVideo } from '@shinju-date/youtube-scraper'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'

export type SavedVideoForCheck = {
  id: string
  duration: string
  published_at: string
  status: 'UPCOMING' | 'LIVE' | 'ENDED'
  title: string
  youtube_video: {
    youtube_video_id: string
  }
}

export type YouTubeVideoData = {
  id: string
  contentDetails?: { duration?: string }
  snippet?: { title?: string; publishedAt?: string }
  liveStreamingDetails?: {
    scheduledStartTime?: string
    actualStartTime?: string
    actualEndTime?: string
  }
}

type UpdateVideoIfNeededOptions = {
  currentDateTime: Temporal.Instant
  originalVideo: YouTubeVideoData
  savedVideo: SavedVideoForCheck
  supabaseClient: TypedSupabaseClient
}

export type VideoUpdate = {
  id: string
  duration: string
  published_at: string
  status: 'UPCOMING' | 'LIVE' | 'ENDED'
  title: string
  updated_at: string
}

/**
 * Compares a video from YouTube with the saved version and returns update data if changes are detected
 * @returns Update data if the video needs updating, null otherwise
 */
export function getVideoUpdateIfNeeded({
  currentDateTime,
  originalVideo,
  savedVideo,
}: Omit<UpdateVideoIfNeededOptions, 'supabaseClient'>): VideoUpdate | null {
  const updateValue: Partial<TablesInsert<'videos'>> = {}
  let hasUpdate = false

  // Check status
  const newStatus = getVideoStatus(originalVideo, currentDateTime)
  if (savedVideo.status !== newStatus) {
    updateValue.status = newStatus
    hasUpdate = true
  }

  // Check duration
  const newDuration = originalVideo.contentDetails?.duration ?? 'P0D'
  if (savedVideo.duration !== newDuration) {
    updateValue.duration = newDuration
    hasUpdate = true
  }

  // Check published_at
  const newPublishedAt = getPublishedAt(originalVideo)
  if (newPublishedAt) {
    const savedPublishedAt = Temporal.Instant.from(savedVideo.published_at)
    if (!savedPublishedAt.equals(newPublishedAt)) {
      updateValue.published_at = toDBString(newPublishedAt)
      hasUpdate = true
    }
  }

  // Check title
  const newTitle = originalVideo.snippet?.title ?? ''
  if (savedVideo.title !== newTitle) {
    updateValue.title = newTitle
    hasUpdate = true
  }

  // Return update data if needed
  if (hasUpdate) {
    return {
      duration: updateValue.duration ?? savedVideo.duration,
      id: savedVideo.id,
      published_at: updateValue.published_at ?? savedVideo.published_at,
      status: updateValue.status ?? savedVideo.status,
      title: updateValue.title ?? savedVideo.title,
      updated_at: toDBString(currentDateTime),
    }
  }

  return null
}

/**
 * Performs batch update of videos in the database
 * @returns The number of videos updated
 */
export async function batchUpdateVideos({
  updates,
  supabaseClient,
}: {
  updates: VideoUpdate[]
  supabaseClient: TypedSupabaseClient
}): Promise<number> {
  if (updates.length === 0) {
    return 0
  }

  // Update each video individually since we're only updating specific fields
  const updatePromises = updates.map((update) => {
    const { id, ...updateData } = update
    return supabaseClient.from('videos').update(updateData).eq('id', id)
  })

  const results = await Promise.all(updatePromises)

  // Check for errors
  const firstError = results.find((result) => result.error)
  if (firstError?.error) {
    throw new TypeError(firstError.error.message, {
      cause: firstError.error,
    })
  }

  return updates.length
}

/**
 * Process scraped video for checking and updating
 * Designed to be used as a callback with scraper.scrapeVideos()
 * Only handles video updates - deletion should be done separately after all batches are processed
 * Returns whether any changes occurred (for cache revalidation)
 */
export async function processScrapedVideoForCheck<
  T extends {
    id: string
    duration: string
    published_at: string
    status: 'UPCOMING' | 'LIVE' | 'ENDED'
    title: string
    youtube_video: {
      youtube_video_id: string
    }
    thumbnails?: { id: string } | Array<{ id: string }> | null
  },
>({
  originalVideos,
  currentDateTime,
  savedVideos,
  supabaseClient,
  logger,
  mode,
}: {
  originalVideos: YouTubeVideo[]
  currentDateTime: Temporal.Instant
  savedVideos: T[]
  supabaseClient: TypedSupabaseClient
  logger: {
    info: (message: string, attributes?: Record<string, unknown>) => void
  }
  mode: string
}): Promise<boolean> {
  const videoUpdates: VideoUpdate[] = []

  // Process available videos and collect updates
  for (const originalVideo of originalVideos) {
    // Find corresponding saved video
    const savedVideo = savedVideos.find(
      (v) => v.youtube_video?.youtube_video_id === originalVideo.id,
    )

    if (!savedVideo) {
      continue
    }

    // Convert YouTubeVideo to YouTubeVideoData format
    const videoData: YouTubeVideoData = {
      id: originalVideo.id,
    }

    if (originalVideo.contentDetails.duration) {
      videoData.contentDetails = {
        duration: originalVideo.contentDetails.duration,
      }
    }

    if (originalVideo.snippet.title || originalVideo.snippet.publishedAt) {
      videoData.snippet = {
        ...(originalVideo.snippet.title && {
          title: originalVideo.snippet.title,
        }),
        publishedAt: originalVideo.snippet.publishedAt,
      }
    }

    if (originalVideo.liveStreamingDetails) {
      videoData.liveStreamingDetails = {}
      if (originalVideo.liveStreamingDetails.scheduledStartTime) {
        videoData.liveStreamingDetails.scheduledStartTime =
          originalVideo.liveStreamingDetails.scheduledStartTime
      }
      if (originalVideo.liveStreamingDetails.actualStartTime) {
        videoData.liveStreamingDetails.actualStartTime =
          originalVideo.liveStreamingDetails.actualStartTime
      }
      if (originalVideo.liveStreamingDetails.actualEndTime) {
        videoData.liveStreamingDetails.actualEndTime =
          originalVideo.liveStreamingDetails.actualEndTime
      }
    }

    // Check if video needs updating and collect update data
    const updateData = getVideoUpdateIfNeeded({
      currentDateTime,
      originalVideo: videoData,
      savedVideo,
    })

    if (updateData) {
      videoUpdates.push(updateData)
    }
  }

  // Perform batch update if there are changes
  if (videoUpdates.length > 0) {
    await batchUpdateVideos({
      supabaseClient,
      updates: videoUpdates,
    })

    logger.info('動画が更新されました', {
      count: videoUpdates.length,
      mode,
    })
  }

  // Return true if any changes occurred (updates only - deletions handled separately)
  return videoUpdates.length > 0
}

/**
 * Process scraped video availability check
 * Designed to be used as a callback with scraper.scrapeVideosAvailability()
 * Processes arrays of videos, performs deletions, and logs results
 */
export async function processScrapedVideoAvailability({
  videos,
  currentDateTime,
  savedVideos,
  supabaseClient,
  logger,
}: {
  videos: {
    id: string
    isAvailable: boolean
  }[]
  currentDateTime: Temporal.Instant
  savedVideos: Array<{
    id: string
    youtube_video?: { youtube_video_id: string } | null
    thumbnails?: { id: string } | Array<{ id: string }> | null
  }>
  supabaseClient: TypedSupabaseClient
  logger: {
    info: (message: string, attributes?: Record<string, unknown>) => void
  }
}): Promise<void> {
  const videoIdsToDelete: string[] = []
  const thumbnailIdsToDelete: string[] = []

  for (const video of videos) {
    // If video is available, nothing to do
    if (video.isAvailable) {
      continue
    }

    // Video is not available - find it in saved videos
    const savedVideo = savedVideos.find(
      (v) => v.youtube_video?.youtube_video_id === video.id,
    )

    if (!savedVideo) {
      continue
    }

    // Collect IDs for batch deletion
    videoIdsToDelete.push(savedVideo.id)

    const thumbnail = Array.isArray(savedVideo.thumbnails)
      ? savedVideo.thumbnails[0]
      : savedVideo.thumbnails

    if (thumbnail) {
      thumbnailIdsToDelete.push(thumbnail.id)
    }

    logger.info('動画を削除しました', {
      videoId: video.id,
    })
  }

  // Perform batch deletion if there are videos to delete
  if (videoIdsToDelete.length > 0) {
    try {
      await Promise.all([
        softDeleteRows({
          currentDateTime,
          ids: videoIdsToDelete,
          supabaseClient,
          table: 'videos',
        }),
        thumbnailIdsToDelete.length > 0
          ? softDeleteRows({
              currentDateTime,
              ids: thumbnailIdsToDelete,
              supabaseClient,
              table: 'thumbnails',
            })
          : Promise.resolve(),
      ])

      logger.info('動画が削除されました', {
        count: videoIdsToDelete.length,
      })
    } catch (error) {
      throw new Error(`Failed to delete videos: ${error}`)
    }
  }
}

/**
 * Process deleted videos (videos that are no longer available on YouTube)
 * Handles soft deletion of videos and their thumbnails
 */
export async function processDeletedVideos({
  savedVideos,
  availableVideoIds,
  currentDateTime,
  supabaseClient,
}: {
  savedVideos: Array<{
    id: string
    youtube_video?: { youtube_video_id: string } | null
    thumbnails?: { id: string } | Array<{ id: string }> | null
  }>
  availableVideoIds: Set<string>
  currentDateTime: Temporal.Instant
  supabaseClient: TypedSupabaseClient
}): Promise<{
  deletedCount: number
  deletedVideoIds: string[]
  errors?: Error[]
}> {
  const deletedVideos = savedVideos.filter(
    (savedVideo) =>
      savedVideo.youtube_video?.youtube_video_id &&
      !availableVideoIds.has(savedVideo.youtube_video.youtube_video_id),
  )

  if (deletedVideos.length === 0) {
    return { deletedCount: 0, deletedVideoIds: [] }
  }

  // Extract thumbnails from deleted videos
  const thumbnails = deletedVideos
    .map((video) =>
      Array.isArray(video.thumbnails) ? video.thumbnails[0] : video.thumbnails,
    )
    .filter(Boolean) as Array<{ id: string }>

  // Soft delete videos and thumbnails
  const results = await Promise.allSettled([
    softDeleteRows({
      currentDateTime,
      ids: deletedVideos.map((video) => video.id),
      supabaseClient,
      table: 'videos',
    }),
    softDeleteRows({
      currentDateTime,
      ids: thumbnails.map((thumbnail) => thumbnail.id),
      supabaseClient,
      table: 'thumbnails',
    }),
  ])

  const rejectedResults = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  const deletedCount = deletedVideos.length - rejectedResults.length
  const deletedVideoIds = deletedVideos
    .map((video) => video.youtube_video?.youtube_video_id)
    .filter((id): id is string => Boolean(id))

  return {
    deletedCount,
    deletedVideoIds,
    errors: rejectedResults.map((r) => r.reason),
  }
}

async function softDeleteRows({
  currentDateTime,
  ids,
  supabaseClient,
  table,
}: {
  currentDateTime: Temporal.Instant
  ids: string[]
  supabaseClient: TypedSupabaseClient
  table: 'videos' | 'thumbnails'
}): Promise<{ id: string }[]> {
  const { data, error } = await supabaseClient
    .from(table)
    .update({
      deleted_at: toDBString(currentDateTime),
      updated_at: toDBString(currentDateTime),
    })
    .in('id', ids)
    .select('id')

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return data
}
