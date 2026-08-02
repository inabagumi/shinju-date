'use server'

import type { TablesUpdate } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  getClips,
  getVideos as getTwitchVideos,
  secondsToISO8601,
  twitchDurationToISO8601,
} from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import { getVideos } from '@shinju-date/youtube-api-client'
import { getPublishedAt, getVideoStatus } from '@shinju-date/youtube-scraper'
import { revalidatePath } from 'next/cache'
import { Temporal } from 'temporal-polyfill'
import { createAuditLog } from '@/lib/audit-log'
import { createSupabaseServerClient } from '@/lib/supabase'

export async function syncVideoWithYouTube(videoId: string): Promise<{
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
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
        message: '動画情報は既に最新です。',
        success: true,
        unchanged: true,
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
    await revalidateTags(['videos'])
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

/**
 * Twitch 動画（VOD / highlight / upload / clip）を Helix API から同期する。
 */
export async function syncVideoWithTwitch(videoId: string): Promise<{
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}> {
  const supabaseClient = await createSupabaseServerClient()

  try {
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select(
        'id, title, visible, duration, published_at, status, platform, twitch_video:twitch_videos!inner(id, twitch_video_id, type)',
      )
      .eq('id', videoId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    if (!video.twitch_video?.twitch_video_id) {
      return {
        error: 'この動画はTwitch動画ではありません。',
        success: false,
      }
    }

    const twitchVideoId = video.twitch_video.twitch_video_id
    const isClip = video.twitch_video.type === 'clip'

    let nextTitle: string
    let nextDuration: string
    let nextPublishedAt: Temporal.Instant
    let nextStatus: TablesUpdate<'videos'>['status']
    let nextType: 'archive' | 'highlight' | 'upload' | 'clip'

    if (isClip) {
      const clips = await Array.fromAsync(getClips({ ids: [twitchVideoId] }))
      const clip = clips[0]

      if (!clip) {
        return {
          error:
            'Twitchでクリップが見つかりませんでした。削除されている可能性があります。',
          success: false,
        }
      }

      nextTitle = clip.title
      nextDuration = secondsToISO8601(clip.duration)
      nextPublishedAt = Temporal.Instant.from(clip.created_at)
      nextStatus = 'PUBLISHED'
      nextType = 'clip'
    } else {
      const twitchVideos = await Array.fromAsync(
        getTwitchVideos({ ids: [twitchVideoId] }),
      )
      const twitchVideo = twitchVideos[0]

      if (!twitchVideo) {
        return {
          error:
            'Twitchで動画が見つかりませんでした。削除されている可能性があります。',
          success: false,
        }
      }

      const duration = twitchDurationToISO8601(twitchVideo.duration)
      if (!duration) {
        return {
          error: 'Twitchから再生時間を取得できませんでした。',
          success: false,
        }
      }

      nextTitle = twitchVideo.title
      nextDuration = duration
      nextPublishedAt = Temporal.Instant.from(
        twitchVideo.published_at || twitchVideo.created_at,
      )
      // archive/highlight are past broadcasts; uploads are regular videos
      nextStatus =
        twitchVideo.type === 'upload'
          ? 'PUBLISHED'
          : twitchVideo.type === 'archive' || twitchVideo.type === 'highlight'
            ? 'ENDED'
            : 'PUBLISHED'
      nextType = twitchVideo.type
    }

    const currentDateTime = Temporal.Now.instant()
    const updateData: TablesUpdate<'videos'> = {
      updated_at: toDBString(currentDateTime),
    }

    let hasChanges = false

    if (nextTitle !== video.title) {
      updateData.title = nextTitle
      hasChanges = true
    }

    if (nextDuration !== video.duration) {
      updateData.duration = nextDuration
      hasChanges = true
    }

    const currentPublishedAt = Temporal.Instant.from(video.published_at)
    if (!nextPublishedAt.equals(currentPublishedAt)) {
      updateData.published_at = toDBString(nextPublishedAt)
      hasChanges = true
    }

    if (nextStatus && video.status !== nextStatus) {
      updateData.status = nextStatus
      hasChanges = true
    }

    const typeChanged = nextType !== video.twitch_video.type
    if (typeChanged) {
      hasChanges = true
    }

    if (!hasChanges) {
      return {
        message: '動画情報は既に最新です。',
        success: true,
        unchanged: true,
      }
    }

    if (
      updateData.title !== undefined ||
      updateData.duration !== undefined ||
      updateData.published_at !== undefined ||
      updateData.status !== undefined
    ) {
      const { error: updateError } = await supabaseClient
        .from('videos')
        .update(updateData)
        .eq('id', videoId)

      if (updateError) {
        throw updateError
      }
    }

    if (typeChanged) {
      const { error: typeError } = await supabaseClient
        .from('twitch_videos')
        .update({ type: nextType })
        .eq('id', video.twitch_video.id)

      if (typeError) {
        throw typeError
      }
    }

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
      platform: 'twitch',
      ...(typeChanged
        ? {
            twitch_type: {
              after: nextType,
              before: video.twitch_video.type,
            },
          }
        : {}),
    })

    revalidatePath(`/videos/${videoId}`)
    revalidatePath('/videos')
    await revalidateTags(['videos'])
    return { success: true }
  } catch (error) {
    logger.error('Twitch動画の同期に失敗しました', { error, videoId })
    return {
      error:
        error instanceof Error
          ? error.message
          : '予期しないエラーが発生しました。',
      success: false,
    }
  }
}
