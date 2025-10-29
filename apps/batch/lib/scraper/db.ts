import * as Sentry from '@sentry/nextjs'
import type { Tables, TablesInsert } from '@shinju-date/database'
import type { TypedSupabaseClient } from '@/lib/supabase'
import { DatabaseError } from './errors'
import type { SavedVideo } from './types'

export type VideoChannel = Pick<Tables<'channels'>, 'name' | 'slug'>

export type VideoThumbnail = Omit<
  Tables<'thumbnails'>,
  'created_at' | 'deleted_at' | 'etag' | 'id' | 'updated_at'
>

export type Video = Pick<
  Tables<'videos'>,
  'duration' | 'id' | 'published_at' | 'slug' | 'title'
> & {
  channels: VideoChannel | VideoChannel[] | null
  thumbnails: VideoThumbnail | VideoThumbnail[] | null
}

const scrapeResultSelect = `
  channels (
    name,
    slug
  ),
  duration,
  id,
  published_at,
  slug,
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
        .from('videos')
        .select(
          `
            id,
            created_at,
            deleted_at,
            duration,
            platform,
            published_at,
            slug,
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
          `,
        )
        .in('slug', ids.slice(i, i + 100))

      if (error) {
        throw new TypeError(error.message, {
          cause: error,
        })
      }

      yield* videos
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

  async upsertVideos(values: TablesInsert<'videos'>[]): Promise<Video[]> {
    const upsertValues = values.filter((value) => value.id)
    const insertValues = values.filter((value) => !value.id)

    const results = await Promise.allSettled([
      upsertValues.length > 0
        ? this.#supabaseClient
            .from('videos')
            .upsert(upsertValues)
            .select(scrapeResultSelect)
            .then(({ data, error }) => {
              if (error) {
                throw new DatabaseError(error)
              }

              return data
            })
        : Promise.resolve([]),
      insertValues.length > 0
        ? this.#supabaseClient
            .from('videos')
            .insert(insertValues)
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

    // Dual-write to youtube_videos table
    if (videos.length > 0) {
      const youtubeVideoValues: TablesInsert<'youtube_videos'>[] = videos.map(
        (video) => ({
          video_id: video.id,
          youtube_video_id: video.slug,
        }),
      )

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
    }

    return videos
  }

  async [Symbol.asyncDispose](): Promise<void> {
    // DB cleanup if needed - currently no resources to dispose
  }
}
