import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import type { Temporal } from 'temporal-polyfill'
import type { TypedSupabaseClient } from '@/lib/supabase'

export type Video = {
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
  savedVideo: Video
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

  const { error } = await supabaseClient.from('videos').upsert(updates, {
    onConflict: 'id',
  })

  if (error) {
    throw new TypeError(error.message, {
      cause: error,
    })
  }

  return updates.length
}
