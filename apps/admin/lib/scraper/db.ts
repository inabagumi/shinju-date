import {
  type DefaultDatabase,
  createSupabaseClient
} from '@shinju-date/supabase'
import { captureException } from '@/lib/logging'
import { DatabaseError } from './errors'
import { type SavedVideo } from './types'

type TypedSupabaseClient = ReturnType<typeof createSupabaseClient>

export type VideoChannel = Pick<
  DefaultDatabase['public']['Tables']['channels']['Row'],
  'name' | 'slug' | 'url'
>

export type VideoThumbnail = Omit<
  DefaultDatabase['public']['Tables']['thumbnails']['Row'],
  'created_at' | 'deleted_at' | 'etag' | 'id' | 'updated_at'
>

export type Video = Pick<
  DefaultDatabase['public']['Tables']['videos']['Row'],
  'duration' | 'published_at' | 'slug' | 'title' | 'url'
> & {
  channels: VideoChannel | VideoChannel[] | null
  thumbnails: VideoThumbnail | VideoThumbnail[] | null
}

const scrapeResultSelect = `
  channels (
    name,
    slug,
    url
  ),
  duration,
  published_at,
  slug,
  thumbnails (
    blur_data_url,
    height,
    path,
    width
  ),
  title,
  url
`

export default class DB {
  #supabaseClient: TypedSupabaseClient

  constructor(supabaseClient: TypedSupabaseClient) {
    this.#supabaseClient = supabaseClient
  }

  get client(): TypedSupabaseClient {
    return this.#supabaseClient
  }

  async *getSavedVideos(
    ids: string[]
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
            title
          `
        )
        .in('slug', ids.slice(i, i + 100))

      if (error) {
        throw error
      }

      yield* videos
    }
  }

  async upsertThumbnails(
    values: DefaultDatabase['public']['Tables']['thumbnails']['Insert'][]
  ): Promise<{ id: number; path: string }[]> {
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
        : Promise.resolve([])
    ])

    const thumbnails: { id: number; path: string }[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const thumbnail of result.value) {
          thumbnails.push(thumbnail)
        }
      } else {
        captureException(result.reason)
      }
    }

    return thumbnails
  }

  async upsertVideos(
    values: DefaultDatabase['public']['Tables']['videos']['Insert'][]
  ): Promise<Video[]> {
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
        : Promise.resolve([])
    ])

    const videos: Video[] = []

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const video of result.value) {
          videos.push(video)
        }
      } else {
        captureException(result.reason)
      }
    }

    return videos
  }
}
