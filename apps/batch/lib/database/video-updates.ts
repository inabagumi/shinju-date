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
  },
>({
  originalVideo,
  currentDateTime,
  savedVideos,
  availableVideoIds,
  videoUpdates,
}: {
  originalVideo: YouTubeVideo
  currentDateTime: Temporal.Instant
  savedVideos: T[]
  availableVideoIds: Set<string>
  videoUpdates: VideoUpdate[]
}): Promise<void> {
  availableVideoIds.add(originalVideo.id)

  // Find corresponding saved video
  const savedVideo = savedVideos.find(
    (v) => v.youtube_video?.youtube_video_id === originalVideo.id,
  )

  if (!savedVideo) {
    return
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
