/**
 * The `@msw/data` collections of the mock database. Each schema is checked
 * against the row type of its table (`satisfies z.ZodType<Tables<…>>`), so a
 * column that the database has and a schema lacks is a type error.
 */

import { Collection } from '@msw/data'
import { Constants, type Tables } from '@shinju-date/database'
import { z } from 'zod'
import { createAccounts } from './seeds/accounts.js'
import { createAnnouncements } from './seeds/announcements.js'
import { createAuditLogs } from './seeds/audit-logs.js'
import { createBackfills } from './seeds/backfills.js'
import { createSeedContext } from './seeds/context.js'
import { createFeatureRequests } from './seeds/feature-requests.js'
import { createScheduleVideos } from './seeds/schedule.js'
import { createTerms } from './seeds/terms.js'
import {
  createThumbnails,
  createTwitchVideos,
  createYouTubeVideos,
  linkYouTubeVideos,
} from './seeds/videos.js'

// Talents collection
export const talents = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    id: z.string().uuid(),
    name: z.string(),
    reading: z.string().nullable(),
    status: z.enum(Constants.public.Enums.talent_status),
    theme_color: z.string().nullable(),
    updated_at: z.string(),
  }) satisfies z.ZodType<Tables<'talents'>>,
})

// Thumbnails collection
export const thumbnails = new Collection({
  schema: z.object({
    blur_data_url: z.string(),
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    etag: z.string().nullable(),
    height: z.number(),
    id: z.string().uuid(),
    path: z.string(),
    updated_at: z.string(),
    width: z.number(),
  }) satisfies z.ZodType<Tables<'thumbnails'>>,
})

// Profile images (icons of YouTube channels and Twitch users)
export const profileImages = new Collection({
  schema: z.object({
    blur_data_url: z.string(),
    created_at: z.string(),
    etag: z.string().nullable(),
    height: z.number(),
    id: z.string().uuid(),
    path: z.string(),
    source_url: z.string(),
    updated_at: z.string(),
    width: z.number(),
  }) satisfies z.ZodType<Tables<'profile_images'>>,
})

// Videos collection
export const videos = new Collection({
  schema: z.object({
    created_at: z.string(),
    deleted_at: z.string().nullable(),
    deleted_reason: z
      .enum(Constants.public.Enums.video_deleted_reason)
      .nullable(),
    duration: z.string(),
    id: z.string().uuid(),
    platform: z.enum(Constants.public.Enums.platform_type),
    published_at: z.string(),
    status: z.enum(Constants.public.Enums.video_status),
    talent_id: z.string().uuid(),
    thumbnail_id: z.string().uuid().nullable(),
    title: z.string(),
    updated_at: z.string(),
    video_kind: z.enum(Constants.public.Enums.video_kind),
    visible: z.boolean(),
  }) satisfies z.ZodType<Tables<'videos'>>,
})

// YouTube channels collection
export const youtubeChannels = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    profile_image_id: z.string().uuid().nullable(),
    talent_id: z.string().uuid(),
    youtube_channel_id: z.string(),
    youtube_handle: z.string().nullable(),
  }) satisfies z.ZodType<Tables<'youtube_channels'>>,
})

// Twitch users collection
export const twitchUsers = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    profile_image_id: z.string().uuid().nullable(),
    talent_id: z.string().uuid(),
    twitch_login_name: z.string().nullable(),
    twitch_user_id: z.string(),
  }) satisfies z.ZodType<Tables<'twitch_users'>>,
})

// Backfill jobs that finished (history recorded by the batch app)
export const videoBackfillJobs = new Collection({
  schema: z.object({
    account_id: z.string().uuid(),
    added: z.number(),
    created_at: z.string(),
    error: z.string().nullable(),
    finished_at: z.string(),
    id: z.string().uuid(),
    pages: z.number(),
    platform: z.enum(Constants.public.Enums.platform_type),
    requested_at: z.string(),
    requested_by: z.string().nullable(),
    run_id: z.string().uuid().nullable(),
    started_at: z.string().nullable(),
    status: z.enum(Constants.public.Enums.video_backfill_job_status),
    talent_id: z.string().uuid(),
  }) satisfies z.ZodType<Tables<'video_backfill_jobs'>>,
})

// YouTube videos collection
export const youtubeVideos = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    video_id: z.string().uuid(),
    youtube_channel_id: z.string(),
    youtube_video_id: z.string(),
  }) satisfies z.ZodType<Tables<'youtube_videos'>>,
})

// Twitch videos collection
export const twitchVideos = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    stream_id: z.string().nullable(),
    twitch_user_id: z.string().uuid(),
    twitch_video_id: z.string(),
    type: z.enum(Constants.public.Enums.twitch_video_type).nullable(),
    video_id: z.string().uuid(),
  }) satisfies z.ZodType<Tables<'twitch_videos'>>,
})

// Terms collection
export const terms = new Collection({
  schema: z.object({
    created_at: z.string(),
    id: z.string().uuid(),
    popularity: z.number(),
    readings: z.array(z.string()),
    synonyms: z.array(z.string()),
    term: z.string(),
    updated_at: z.string(),
  }) satisfies z.ZodType<Tables<'terms'>>,
})

// Announcements collection
export const announcements = new Collection({
  schema: z.object({
    created_at: z.string(),
    enabled: z.boolean(),
    end_at: z.string(),
    id: z.string().uuid(),
    level: z.string(),
    message: z.string(),
    start_at: z.string(),
    updated_at: z.string(),
  }) satisfies z.ZodType<Tables<'announcements'>>,
})

// Feature requests sent from the feedback form of the public site
export const featureRequests = new Collection({
  schema: z.object({
    admin_memo: z.string().nullable(),
    created_at: z.string(),
    id: z.string().uuid(),
    is_read: z.boolean(),
    message: z.string(),
    status: z.enum(Constants.public.Enums.feature_request_status),
    updated_at: z.string(),
  }) satisfies z.ZodType<Tables<'feature_requests'>>,
})

// Audit logs of the admin app
export const auditLogs = new Collection({
  schema: z.object({
    action: z.enum(Constants.public.Enums.audit_action),
    created_at: z.string(),
    // JSON from the apps, which the mock saves as it is
    details: z.custom<Tables<'audit_logs'>['details']>(),
    id: z.string().uuid(),
    target_record_id: z.string().nullable(),
    target_table: z.string().nullable(),
    // The ID of the mock user is not a UUID
    user_id: z.string().nullable(),
  }) satisfies z.ZodType<Tables<'audit_logs'>>,
})

/** Every collection, which `seedCollections` empties before seeding. */
const COLLECTIONS = [
  announcements,
  auditLogs,
  featureRequests,
  profileImages,
  talents,
  terms,
  thumbnails,
  twitchUsers,
  twitchVideos,
  videoBackfillJobs,
  videos,
  youtubeChannels,
  youtubeVideos,
] as const

/**
 * Insert rows one by one, so that the collection keeps them in the order of
 * `rows` (the order that the mock returns them in without `order`).
 */
async function insert<Row>(
  collection: { create(values: Row): Promise<unknown> },
  rows: readonly Row[],
): Promise<void> {
  for (const row of rows) {
    await collection.create(row)
  }
}

export interface SeedCollectionsOptions {
  /**
   * The time that the seed data is made around, such as the streams on air
   * and the schedule of the current week. Defaults to the current time.
   */
  now?: Temporal.Instant | undefined
}

/**
 * Seed the collections with the mock data, replacing what they have. The
 * data is made by the scenarios in `src/seeds/` with a fixed seed of faker,
 * so the same `now` always gives the same data.
 */
export async function seedCollections({
  now = Temporal.Now.instant(),
}: SeedCollectionsOptions = {}): Promise<void> {
  const context = createSeedContext(now)

  for (const collection of COLLECTIONS) {
    collection.clear()
  }

  const accounts = createAccounts(context)
  const thumbnailRows = createThumbnails(context)
  const youtubeVideoRows = [
    ...createYouTubeVideos(context, {
      talents: accounts.talentsWithVideos,
      thumbnails: thumbnailRows,
    }),
    ...createScheduleVideos(context, {
      talents: accounts.talentsWithVideos,
      thumbnails: thumbnailRows,
    }),
  ]
  const twitch = createTwitchVideos(context, {
    thumbnails: thumbnailRows,
    twitchUsers: accounts.twitchUsers,
  })
  const termRows = createTerms(context)

  await insert(talents, accounts.talents)
  await insert(thumbnails, thumbnailRows)
  await insert(videos, [...youtubeVideoRows, ...twitch.videos])
  await insert(profileImages, accounts.profileImages)
  await insert(youtubeChannels, accounts.youtubeChannels)
  await insert(twitchUsers, accounts.twitchUsers)
  await insert(
    videoBackfillJobs,
    createBackfills(context, {
      twitchUsers: accounts.twitchUsers,
      youtubeChannels: accounts.youtubeChannels,
    }),
  )
  await insert(
    youtubeVideos,
    linkYouTubeVideos(context, {
      videos: youtubeVideoRows,
      youtubeChannels: accounts.youtubeChannels,
    }),
  )
  await insert(twitchVideos, twitch.twitchVideos)
  await insert(terms, termRows)
  await insert(announcements, createAnnouncements(context))
  await insert(featureRequests, createFeatureRequests(context))
  await insert(
    auditLogs,
    createAuditLogs(context, {
      talents: accounts.talentsWithVideos,
      terms: termRows,
      videos: youtubeVideoRows,
    }),
  )
}

let seeding: Promise<void> | undefined

/**
 * Seed the collections only once, even when several handlers need them.
 * The Redis mock waits for this as well so that its click data uses the IDs
 * of the seeded videos and talents.
 */
export function ensureCollectionsSeeded(): Promise<void> {
  seeding ??= seedCollections()

  return seeding
}
