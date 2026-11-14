'use server'

import type { Tables, TablesUpdate } from '@shinju-date/database'
import { logger } from '@shinju-date/logger'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  getArchiveOfStream,
  getClips,
  getLiveStream,
  getTwitchVideoStatus,
  getVideos as getTwitchVideos,
  isLiveTwitchVideoId,
  streamIdFromLiveTwitchVideoId,
  type TwitchVideo,
} from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import {
  getPublishedAt,
  getVideoStatus,
  getVideos,
} from '@shinju-date/youtube-api-client'
import { revalidatePath } from 'next/cache'
import { createAuditLog } from '@/lib/audit-log'
import { requireAuthenticatedUser, unauthenticatedResult } from '@/lib/auth'

export async function syncVideoWithYouTube(videoId: string): Promise<{
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

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

type TwitchVideoType = Tables<'twitch_videos'>['type']

/** What Twitch currently reports for a saved Twitch video. */
interface TwitchSyncTarget {
  /** `undefined` keeps the saved value (e.g. while a broadcast is on air). */
  duration?: string
  /** `undefined` keeps the saved value. */
  publishedAt?: Temporal.Instant
  status: Tables<'videos'>['status']
  /** `undefined` keeps the saved value. */
  title?: string
  twitchVideoId: string
  type: TwitchVideoType
}

function fromTwitchVideo(twitchVideo: TwitchVideo): TwitchSyncTarget {
  return {
    duration: twitchVideo.duration,
    publishedAt: Temporal.Instant.from(
      twitchVideo.published_at || twitchVideo.created_at,
    ),
    status: getTwitchVideoStatus(twitchVideo.type),
    title: twitchVideo.title,
    twitchVideoId: twitchVideo.id,
    type: twitchVideo.type,
  }
}

/**
 * Twitch 動画（配信 / アーカイブ / ハイライト / アップロード / クリップ）を
 * Helix API から同期する。
 *
 * ## 配信の扱い
 * バッチ（`@shinju-date/scraper` の Twitch 向け処理）と同じ判定を
 * `@shinju-date/twitch-api-client` の関数で行う。
 *
 * - **配信中**: タイトルだけを更新し、`LIVE` のままにする。配信中に
 *   アーカイブが紐づいた行（Twitch は配信開始時にアーカイブを作る）も同様
 * - **配信終了・アーカイブあり**: 仮の ID（`live:{stream_id}`）の行は
 *   アーカイブ（VOD の ID・長さ・タイトル）に差し替えて `ENDED` にする
 * - **配信終了・アーカイブなし**（VOD 無効など）: `ENDED` にするだけで、
 *   エラーにはしない
 *
 * サムネイルは更新しない（バッチの `mode=recent` が補完する）。
 */
export async function syncVideoWithTwitch(videoId: string): Promise<{
  success: boolean
  error?: string
  message?: string
  unchanged?: boolean
}> {
  const auth = await requireAuthenticatedUser()

  if (!auth) {
    return unauthenticatedResult()
  }

  const { supabaseClient } = auth

  try {
    const { data: video, error: fetchError } = await supabaseClient
      .from('videos')
      .select(
        'id, title, visible, duration, published_at, status, platform, twitch_video:twitch_videos!inner(id, stream_id, twitch_video_id, type, twitch_user:twitch_users(twitch_user_id))',
      )
      .eq('id', videoId)
      .single()

    if (fetchError) {
      throw fetchError
    }

    if (!video) {
      return { error: '動画が見つかりませんでした。', success: false }
    }

    const savedTwitchVideo = video.twitch_video

    if (!savedTwitchVideo?.twitch_video_id) {
      return {
        error: 'この動画はTwitch動画ではありません。',
        success: false,
      }
    }

    const isPlaceholder = isLiveTwitchVideoId(savedTwitchVideo.twitch_video_id)
    const streamId =
      savedTwitchVideo.stream_id ??
      streamIdFromLiveTwitchVideoId(savedTwitchVideo.twitch_video_id)
    const twitchUserId = savedTwitchVideo.twitch_user?.twitch_user_id ?? null

    // Only broadcasts and their archives can be on air.
    const canBeOnAir =
      streamId !== null &&
      (isPlaceholder || savedTwitchVideo.type === 'archive')

    if (canBeOnAir && !twitchUserId) {
      return {
        error: 'この配信のTwitchユーザーが見つかりませんでした。',
        success: false,
      }
    }

    const broadcast =
      canBeOnAir && streamId && twitchUserId
        ? { streamId, userId: twitchUserId }
        : null

    const liveStream = broadcast ? await getLiveStream(broadcast) : null

    let target: TwitchSyncTarget

    if (liveStream) {
      target = {
        status: 'LIVE',
        title: liveStream.title,
        twitchVideoId: savedTwitchVideo.twitch_video_id,
        type: savedTwitchVideo.type,
      }
    } else if (isPlaceholder) {
      const archive = broadcast ? await getArchiveOfStream(broadcast) : null

      target = archive
        ? fromTwitchVideo(archive)
        : {
            status: 'ENDED',
            twitchVideoId: savedTwitchVideo.twitch_video_id,
            type: savedTwitchVideo.type,
          }
    } else if (savedTwitchVideo.type === 'clip') {
      const clips = await Array.fromAsync(
        getClips({ ids: [savedTwitchVideo.twitch_video_id] }),
      )
      const clip = clips[0]

      if (!clip) {
        return {
          error:
            'Twitchでクリップが見つかりませんでした。削除されている可能性があります。',
          success: false,
        }
      }

      target = {
        duration: clip.duration,
        publishedAt: Temporal.Instant.from(clip.created_at),
        status: getTwitchVideoStatus('clip'),
        title: clip.title,
        twitchVideoId: clip.id,
        type: 'clip',
      }
    } else {
      const twitchVideos = await Array.fromAsync(
        getTwitchVideos({ ids: [savedTwitchVideo.twitch_video_id] }),
      )
      const twitchVideo = twitchVideos[0]

      if (!twitchVideo) {
        return {
          error:
            'Twitchで動画が見つかりませんでした。削除されている可能性があります。',
          success: false,
        }
      }

      target = fromTwitchVideo(twitchVideo)
    }

    const updateData: TablesUpdate<'videos'> = {}

    if (target.title !== undefined && target.title !== video.title) {
      updateData.title = target.title
    }

    if (target.duration !== undefined && target.duration !== video.duration) {
      updateData.duration = target.duration
    }

    if (
      target.publishedAt &&
      !target.publishedAt.equals(Temporal.Instant.from(video.published_at))
    ) {
      updateData.published_at = toDBString(target.publishedAt)
    }

    if (target.status !== video.status) {
      updateData.status = target.status
    }

    const twitchVideoIdChanged =
      target.twitchVideoId !== savedTwitchVideo.twitch_video_id
    const typeChanged = target.type !== savedTwitchVideo.type

    if (
      Object.keys(updateData).length === 0 &&
      !twitchVideoIdChanged &&
      !typeChanged
    ) {
      return {
        message: '動画情報は既に最新です。',
        success: true,
        unchanged: true,
      }
    }

    // Link first, like the batch: should the next step fail, the row keeps
    // its status and a later sync finishes the job.
    if (twitchVideoIdChanged || typeChanged) {
      const { error: twitchVideoError } = await supabaseClient
        .from('twitch_videos')
        .update({
          ...(twitchVideoIdChanged
            ? { twitch_video_id: target.twitchVideoId }
            : {}),
          type: target.type,
        })
        .eq('id', savedTwitchVideo.id)

      if (twitchVideoError) {
        throw twitchVideoError
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('videos')
        .update({
          ...updateData,
          updated_at: toDBString(Temporal.Now.instant()),
        })
        .eq('id', videoId)

      if (updateError) {
        throw updateError
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
              after: target.type,
              before: savedTwitchVideo.type,
            },
          }
        : {}),
      ...(twitchVideoIdChanged
        ? {
            twitch_video_id: {
              after: target.twitchVideoId,
              before: savedTwitchVideo.twitch_video_id,
            },
          }
        : {}),
    })

    revalidatePath(`/videos/${videoId}`)
    revalidatePath('/videos')
    await revalidateTags(['videos'])

    if (liveStream) {
      return { message: '配信中の状態を同期しました。', success: true }
    }

    if (isPlaceholder && !twitchVideoIdChanged) {
      return {
        message:
          '配信は終了しています。アーカイブが見つからないため、配信の終了のみ反映しました。',
        success: true,
      }
    }

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
