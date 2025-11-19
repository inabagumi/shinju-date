import type { TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import type { Temporal } from 'temporal-polyfill'

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

export type SupabaseClient = {
  from: (table: string) => {
    update: (data: unknown) => {
      eq: (column: string, value: unknown) => Promise<{ error: Error | null }>
    }
  }
}

type UpdateVideoIfNeededOptions = {
  currentDateTime: Temporal.Instant
  originalVideo: YouTubeVideoData
  savedVideo: Video
  supabaseClient: SupabaseClient
}

/**
 * Compares a video from YouTube with the saved version and updates if changes are detected
 * @returns true if the video was updated, false otherwise
 */
export async function updateVideoIfNeeded({
  currentDateTime,
  originalVideo,
  savedVideo,
  supabaseClient,
}: UpdateVideoIfNeededOptions): Promise<boolean> {
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

  // Perform update if needed
  if (hasUpdate) {
    const { error } = await supabaseClient
      .from('videos')
      .update({
        duration: updateValue.duration ?? savedVideo.duration,
        published_at: updateValue.published_at ?? savedVideo.published_at,
        status: updateValue.status ?? savedVideo.status,
        title: updateValue.title ?? savedVideo.title,
        updated_at: toDBString(currentDateTime),
      })
      .eq('id', savedVideo.id)

    if (error) {
      throw new TypeError(error.message, {
        cause: error,
      })
    }

    return true
  }

  return false
}
