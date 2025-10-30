import * as Sentry from '@sentry/nextjs'
import type { Tables, TablesInsert } from '@shinju-date/database'
import { isNonNullable } from '@shinju-date/helpers'
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
    // Create a mapping from video values to YouTube video IDs for existing videos
    const videoIdMap = new Map<string, string>()
    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      const youtubeVideoId = youtubeVideoIds[i]
      if (value?.id && youtubeVideoId) {
        videoIdMap.set(value.id, youtubeVideoId)
      }
    }

    // Separate upsert and insert values, tracking indices for new inserts
    const upsertItems: Array<{ value: TablesInsert<'videos'>; index: number }> =
      []
    const insertItems: Array<{ value: TablesInsert<'videos'>; index: number }> =
      []

    for (let i = 0; i < values.length; i++) {
      const value = values[i]
      if (value?.id) {
        upsertItems.push({ index: i, value })
      } else {
        insertItems.push({ index: i, value })
      }
    }

    const results = await Promise.allSettled([
      upsertItems.length > 0
        ? this.#supabaseClient
            .from('videos')
            .upsert(upsertItems.map((item) => item.value))
            .select(scrapeResultSelect)
            .then(({ data, error }) => {
              if (error) {
                throw new DatabaseError(error)
              }

              return data
            })
        : Promise.resolve([]),
      insertItems.length > 0
        ? this.#supabaseClient
            .from('videos')
            .insert(insertItems.map((item) => item.value))
            .select(scrapeResultSelect)
            .then(({ data, error }) => {
              if (error) {
                throw new DatabaseError(error)
              }

              return data
            })
        : Promise.resolve([]),
    ])

    const videos: Video[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const video of result.value) {
          videos.push(video)
        }
      } else {
        Sentry.captureException(result.reason)
      }
    }

    // Write to youtube_videos table
    // For new inserts, we need to match by order since IDs are newly generated
    if (videos.length > 0) {
      // Add newly inserted videos to the map by matching order
      const insertedVideos =
        results[1]?.status === 'fulfilled' ? results[1].value : []
      for (
        let i = 0;
        i < insertedVideos.length && i < insertItems.length;
        i++
      ) {
        const video = insertedVideos[i]
        const originalIndex = insertItems[i]?.index
        if (video && originalIndex !== undefined) {
          const youtubeVideoId = youtubeVideoIds[originalIndex]
          if (youtubeVideoId) {
            videoIdMap.set(video.id, youtubeVideoId)
          }
        }
      }

      const youtubeVideoValues: TablesInsert<'youtube_videos'>[] = videos
        .map((video) => {
          const youtubeVideoId = videoIdMap.get(video.id)
          return youtubeVideoId
            ? {
                video_id: video.id,
                youtube_video_id: youtubeVideoId,
              }
            : null
        })
        .filter(isNonNullable)

      if (youtubeVideoValues.length > 0) {
        await Promise.allSettled([
          this.#supabaseClient
            .from('youtube_videos')
            .upsert(youtubeVideoValues, { onConflict: 'video_id' })
            .then(({ error }) => {
              if (error) {
                Sentry.captureException(new DatabaseError(error))
              }
            }),
        ])

        // Add youtube_video_id to the returned videos
        for (const video of videos) {
          const youtubeVideoId = videoIdMap.get(video.id)
          if (youtubeVideoId) {
            video.youtube_video = {
              youtube_video_id: youtubeVideoId,
            }
          }
        }
      }
    }

    return videos
  }

  async [Symbol.asyncDispose](): Promise<void> {
    // DB cleanup if needed - currently no resources to dispose
  }
}
