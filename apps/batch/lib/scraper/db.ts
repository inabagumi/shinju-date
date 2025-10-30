import * as Sentry from '@sentry/nextjs'
import type { Tables, TablesInsert } from '@shinju-date/database'
import type { TypedSupabaseClient } from '@/lib/supabase'
import { DatabaseError } from './errors'
import type { SavedVideo } from './types'

export type VideoChannel = Pick<Tables<'channels'>, 'name'>

export type VideoThumbnail = Omit<
  Tables<'thumbnails'>,
  'created_at' | 'deleted_at' | 'etag' | 'id' | 'updated_at'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'title'
> & {
  channels: VideoChannel | VideoChannel[] | null
  thumbnails: VideoThumbnail | VideoThumbnail[] | null
  youtube_video?: {
    youtube_video_id: string
  }
}

const scrapeResultSelect = `
  channels (
    name
  ),
  duration,
  id,
  published_at,
  thumbnails (
    blur_data_url,
    height,
    path,
    width
  ),
  title
`

export default class DB implements AsyncDisposable {
  #supabaseClient: TypedSupabaseClient

  constructor(supabaseClient: TypedSupabaseClient) {
    this.#supabaseClient = supabaseClient
  }

  get client(): TypedSupabaseClient {
    return this.#supabaseClient
  }

  async *getSavedVideos(
    ids: string[],
  ): AsyncGenerator<SavedVideo, void, undefined> {
    for (let i = 0; i < ids.length; i += 100) {
      const { data: videos, error } = await this.#supabaseClient
        .from('youtube_videos')
        .select(
          `
            video:videos!inner (
              id,
              created_at,
              deleted_at,
              duration,
              platform,
              published_at,
              thumbnail_id,
              thumbnails (
                blur_data_url,
                deleted_at,
                etag,
                height,
                id,
                path,
                updated_at,
                width
              ),
              title,
              visible
            ),
            youtube_video_id
          `,
        )
        .in('youtube_video_id', ids.slice(i, i + 100))

      if (error) {
        throw new TypeError(error.message, {
          cause: error,
        })
      }

      // Transform the response to match expected SavedVideo structure
      const transformedVideos = videos.map((row) => {
        const video = Array.isArray(row.video) ? row.video[0] : row.video
        return {
          ...video,
          youtube_video: {
            youtube_video_id: row.youtube_video_id,
          },
        }
      })

      yield* transformedVideos
    }
  }

  async upsertThumbnails(values: TablesInsert<'thumbnails'>[]): Promise<
    {
      id: string
      path: string
    }[]
  > {
    const upsertValues = values.filter((value) => value.id)
    const insertValues = values.filter((value) => !value.id)
    const results = await Promise.allSettled([
      upsertValues.length > 0
        ? this.#supabaseClient
            .from('thumbnails')
            .upsert(upsertValues)
            .select('id, path')
            .then(({ data, error }) => {
              if (error) {
                throw new DatabaseError(error)
              }

              return data
            })
        : Promise.resolve([]),
      insertValues.length > 0
        ? this.#supabaseClient
            .from('thumbnails')
            .insert(insertValues)
            .select('id, path')
            .then(({ data, error }) => {
              if (error) {
                throw new DatabaseError(error)
              }

              return data
            })
        : Promise.resolve([]),
    ])

    const thumbnails: {
      id: string
      path: string
    }[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const thumbnail of result.value) {
          thumbnails.push(thumbnail)
        }
      } else {
        Sentry.captureException(result.reason)
      }
    }

    return thumbnails
  }

  async upsertVideos(
    values: TablesInsert<'videos'>[],
    youtubeVideoIds: string[],
  ): Promise<Video[]> {
    const originalVideoMap = new Map<string, TablesInsert<'videos'>>()
    for (let i = 0; i < youtubeVideoIds.length; i++) {
      const value = values[i]
      const youtubeVideoId = youtubeVideoIds[i]
      if (value && youtubeVideoId) {
        originalVideoMap.set(youtubeVideoId, value)
      }
    }

    const { data: existingYoutubeVideos, error: selectError } =
      await this.#supabaseClient
        .from('youtube_videos')
        .select('video_id, youtube_video_id')
        .in('youtube_video_id', youtubeVideoIds)

    if (selectError) {
      throw new DatabaseError(selectError)
    }

    const existingVideoMap = new Map<string, string>()
    for (const v of existingYoutubeVideos ?? []) {
      existingVideoMap.set(v.youtube_video_id, v.video_id)
    }

    const videosToUpsert: TablesInsert<'videos'>[] = []
    const videosToInsert: {
      value: TablesInsert<'videos'>
      youtubeVideoId: string
    }[] = []

    for (const [youtubeVideoId, value] of originalVideoMap.entries()) {
      const existingVideoId = existingVideoMap.get(youtubeVideoId)
      if (existingVideoId) {
        videosToUpsert.push({ ...value, id: existingVideoId })
      } else {
        videosToInsert.push({ value, youtubeVideoId })
      }
    }

    const [upsertResult, insertResult] = await Promise.allSettled([
      videosToUpsert.length > 0
        ? this.#supabaseClient
            .from('videos')
            .upsert(videosToUpsert)
            .select(scrapeResultSelect)
        : Promise.resolve({ data: [], error: null }),
      videosToInsert.length > 0
        ? this.#supabaseClient
            .from('videos')
            .insert(videosToInsert.map((v) => v.value))
            .select(scrapeResultSelect)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (upsertResult.status === 'rejected') {
      throw new DatabaseError(upsertResult.reason)
    }
    if (insertResult.status === 'rejected') {
      throw new DatabaseError(insertResult.reason)
    }

    const { data: upsertedVideos, error: upsertError } = upsertResult.value
    const { data: insertedVideos, error: insertError } = insertResult.value

    if (upsertError) throw new DatabaseError(upsertError)
    if (insertError) throw new DatabaseError(insertError)

    const allVideos: Video[] = [
      ...(upsertedVideos ?? []),
      ...(insertedVideos ?? []),
    ]

    const youtubeVideoValues: TablesInsert<'youtube_videos'>[] = []
    if (insertedVideos && insertedVideos.length > 0) {
      for (const [index, video] of insertedVideos.entries()) {
        const originalData = videosToInsert[index]
        if (originalData) {
          youtubeVideoValues.push({
            video_id: video.id,
            youtube_video_id: originalData.youtubeVideoId,
          })
        }
      }

      const { error: youtubeVideosError } = await this.#supabaseClient
        .from('youtube_videos')
        .insert(youtubeVideoValues)

      if (youtubeVideosError) {
        Sentry.captureException(new DatabaseError(youtubeVideosError))
      }
    }

    for (const video of allVideos) {
      let youtubeVideoId: string | undefined
      for (const [ytId, videoId] of existingVideoMap.entries()) {
        if (videoId === video.id) {
          youtubeVideoId = ytId
          break
        }
      }

      if (!youtubeVideoId) {
        const entry = youtubeVideoValues.find((yv) => yv.video_id === video.id)
        if (entry) {
          youtubeVideoId = entry.youtube_video_id
        }
      }

      if (youtubeVideoId) {
        video.youtube_video = {
          youtube_video_id: youtubeVideoId,
        }
      }
    }

    return allVideos
  }

  async [Symbol.asyncDispose](): Promise<void> {
    // DB cleanup if needed - currently no resources to dispose
  }
}
