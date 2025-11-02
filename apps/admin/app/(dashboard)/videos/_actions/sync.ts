'use server'

import type { TablesUpdate } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import { getVideos } from '@shinju-date/youtube-api-client'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function syncVideoWithYouTube(videoId: string): Promise<{
  success: boolean
  error?: string
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    // Get the video from database
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select(
        'id, title, visible, duration, published_at, status, youtube_video:youtube_videos!inner(youtube_video_id)',
      )
      .eq('id', videoId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    if (!video.youtube_video?.youtube_video_id) {
      return {
        error: 'この動画はYouTube動画ではありません。',
        success: false,
      }
    }

    // Fetch video data from YouTube API
    const youtubeVideos = await Array.fromAsync(
      getVideos({ ids: [video.youtube_video.youtube_video_id] }),
    )

    if (youtubeVideos.length === 0) {
      return {
        error:
          'YouTubeで動画が見つかりませんでした。動画が削除されている可能性があります。',
        success: false,
      }
    }

    const youtubeVideo = youtubeVideos[0]

    if (!youtubeVideo) {
      return {
        error:
          'YouTubeで動画が見つかりませんでした。動画が削除されている可能性があります。',
        success: false,
      }
    }

    // Check if snippet and contentDetails exist
    if (!youtubeVideo.snippet?.title || !youtubeVideo.contentDetails) {
      return {
        error: 'YouTubeから動画情報を取得できませんでした。',
        success: false,
      }
    }

    // Note: youtube_videos table already has this video's record since we queried with inner join
    // No need for dual-write here as the record must exist

    const currentDateTime = Temporal.Now.instant()

    // Prepare update data - check what needs to be updated
    const updateData: TablesUpdate<'videos'> = {
      updated_at: toDBString(currentDateTime),
    }

    let hasChanges = false

    // Check title
    if (youtubeVideo.snippet.title !== video.title) {
      updateData.title = youtubeVideo.snippet.title
      hasChanges = true
    }

    // Check duration
    const youtubeDuration = youtubeVideo.contentDetails.duration ?? 'P0D'
    if (youtubeDuration !== video.duration) {
      updateData.duration = youtubeDuration
      hasChanges = true
    }

    const publishedAt = getPublishedAt(youtubeVideo)

    if (publishedAt) {
      const currentPublishedAt = Temporal.Instant.from(video.published_at)

      if (!publishedAt.equals(currentPublishedAt)) {
        updateData.published_at = toDBString(publishedAt)
        hasChanges = true
      }
    }

    const status = getVideoStatus(youtubeVideo)

    if (video.status !== status) {
      updateData.status = status
      hasChanges = true
    }

    if (!hasChanges) {
      return {
        error: '動画情報は既に最新です。',
        success: false,
      }
    }

    // Update video with YouTube data
    const { error: updateError } = await supabaseClient
      .from('videos')
      .update(updateData)
      .eq('id', videoId)

    if (updateError) {
      throw updateError
    }

    // Log audit entry with before/after details
    const beforeData: TablesUpdate<'videos'> = {}
    const afterData: TablesUpdate<'videos'> = {}

    if ('title' in updateData) {
      beforeData.title = video.title
      afterData.title = updateData.title
    }
    if ('duration' in updateData) {
      beforeData.duration = video.duration
      afterData.duration = updateData.duration
    }
    if ('published_at' in updateData) {
      beforeData.published_at = video.published_at
      afterData.published_at = updateData.published_at
    }
    if ('status' in updateData) {
      beforeData.status = video.status
      afterData.status = updateData.status
    }

    await createAuditLog('VIDEO_SYNC', 'videos', videoId, {
      after: afterData,
      before: beforeData,
    })

    revalidatePath(`/videos/${videoId}`)
    revalidatePath('/videos')
    return { success: true }
  } catch (error) {
    logger.error('動画の同期に失敗しました', { error, videoId })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
