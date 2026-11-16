import type Database from '@shinju-date/database'
import type { Tables, TablesInsert } from '@shinju-date/database'
import { toDBString } from '@shinju-date/temporal-fns'
import {
  announcements,
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
} from '../../collections.js'

type PublicSchema = Database['public']

/** The name of a table (or view) of the public schema. */
export type TableName =
  | keyof PublicSchema['Tables']
  | keyof PublicSchema['Views']

/** The name of a table, which can be written to unlike a view. */
export type WritableTableName = keyof PublicSchema['Tables']

/** A column of a table (of any of the tables, when `Name` is a union). */
type Column<Name extends TableName> = Name extends TableName
  ? keyof Tables<Name> & string
  : never

/**
 * The part of an `@msw/data` collection that the handlers use. `Rec` is the
 * type of the records that the collection holds (inferred from `findMany`):
 * `update` and `delete` take the records as `findMany` returned them, not
 * copies of them.
 */
export interface MockCollection<Row, Rec extends Row = Row> {
  create(values: Row): Promise<NoInfer<Rec>>
  delete(record: NoInfer<Rec>): unknown
  findMany(): Rec[]
  update(
    record: NoInfer<Rec>,
    options: { data(draft: Row): void },
  ): Promise<NoInfer<Rec> | undefined>
}

/**
 * Check that a collection holds the rows of a table, so that it can be used
 * as a `MockCollection` of them.
 */
function asMockCollection<Row, Rec extends Row>(
  collection: MockCollection<NoInfer<Row>, Rec>,
): MockCollection<Row> {
  return collection
}

/**
 * A relation that `select` can embed, such as `talent:talents(id,name)`. The
 * rows of `table` whose `referencedColumn` equals `column` of this table are
 * embedded: an array of them when `many` is true, or the first of them (or
 * `null`) otherwise.
 */
export type RelationDefinition<Name extends TableName> = {
  [Target in TableName]: {
    column: Column<Name>
    many: boolean
    referencedColumn: Column<Target>
    table: Target
  }
}[TableName]

/** A unique constraint, which inserts, upserts and updates are checked against. */
export interface UniqueConstraint<Name extends TableName> {
  columns: readonly Column<Name>[]
  name: string
}

/**
 * The columns that are `NOT NULL` and have no defaults, which an insert has
 * to give (the columns that are not optional in `TablesInsert`).
 */
type RequiredColumn<Name extends TableName> = Name extends WritableTableName
  ? {
      [Key in keyof TablesInsert<Name>]-?: undefined extends TablesInsert<Name>[Key]
        ? never
        : Key
    }[keyof TablesInsert<Name>] &
      Column<Name>
  : never

interface BaseTableDefinition<Name extends TableName> {
  name: Name
  relations: readonly RelationDefinition<Name>[]
}

/** A table that is read and written through a mock collection. */
export interface WritableTableDefinition<Name extends TableName>
  extends BaseTableDefinition<Name> {
  collection: MockCollection<Tables<Name>>
  /** The values of the columns that have defaults (or are nullable). */
  defaults: () => Omit<Tables<Name>, RequiredColumn<Name>>
  kind: 'table'
  /**
   * The columns that are `NOT NULL` and have no defaults, which an insert
   * has to give.
   */
  requiredColumns: readonly RequiredColumn<Name>[]
  /** Unique constraints other than the primary key (`id`). */
  unique: readonly UniqueConstraint<Name>[]
  /**
   * Whether a trigger (`handle_updated_at`) sets `updated_at` to the current
   * time when a row is updated.
   */
  updatedAtTrigger: boolean
}

/** A view, which the mock only reads. */
export interface ReadOnlyTableDefinition<Name extends TableName>
  extends BaseTableDefinition<Name> {
  kind: 'view'
  rows: () => Promise<Tables<Name>[]>
}

export type TableDefinition<Name extends TableName> =
  | WritableTableDefinition<Name>
  | ReadOnlyTableDefinition<Name>

/** A table definition of any table. */
export type AnyTableDefinition = {
  [Name in TableName]: TableDefinition<Name>
}[TableName]

/** The current time as it is saved in a `TIMESTAMPTZ` column. */
function now(): string {
  return toDBString(Temporal.Now.instant())
}

/**
 * Mirrors the `video_backfill_latest_jobs` view: the latest finished job of
 * each account that still exists, of talents that are not deleted.
 */
async function getLatestVideoBackfillJobs(): Promise<
  Tables<'video_backfill_latest_jobs'>[]
> {
  const talentIds = new Set(
    talents
      .findMany()
      .filter((talent) => talent.deleted_at === null)
      .map((talent) => talent.id),
  )
  const accountIds = {
    twitch: new Set(twitchUsers.findMany().map((user) => user.id)),
    youtube: new Set(youtubeChannels.findMany().map((channel) => channel.id)),
  }
  const seen = new Set<string>()

  return videoBackfillJobs
    .findMany()
    .toSorted((a, b) => b.finished_at.localeCompare(a.finished_at))
    .filter((job) => {
      const key = `${job.platform}:${job.account_id}`

      if (
        seen.has(key) ||
        !talentIds.has(job.talent_id) ||
        !accountIds[job.platform].has(job.account_id)
      ) {
        return false
      }

      seen.add(key)

      return true
    })
}

/** A relation to `talents` from its `talent_id`. */
const TALENT_RELATION = {
  column: 'talent_id',
  many: false,
  referencedColumn: 'id',
  table: 'talents',
} as const

/** A relation to `profile_images` from its `profile_image_id`. */
const PROFILE_IMAGE_RELATION = {
  column: 'profile_image_id',
  many: false,
  referencedColumn: 'id',
  table: 'profile_images',
} as const

/** A relation to `videos` from its `video_id`. */
const VIDEO_RELATION = {
  column: 'video_id',
  many: false,
  referencedColumn: 'id',
  table: 'videos',
} as const

const announcementsTable: WritableTableDefinition<'announcements'> = {
  collection: asMockCollection(announcements),
  defaults: () => ({
    created_at: now(),
    enabled: false,
    id: crypto.randomUUID(),
    level: 'info',
    updated_at: now(),
  }),
  kind: 'table',
  name: 'announcements',
  relations: [],
  requiredColumns: ['end_at', 'message', 'start_at'],
  unique: [],
  updatedAtTrigger: true,
}

const featureRequestsTable: WritableTableDefinition<'feature_requests'> = {
  collection: asMockCollection(featureRequests),
  defaults: () => ({
    admin_memo: null,
    created_at: now(),
    id: crypto.randomUUID(),
    is_read: false,
    status: 'pending',
    updated_at: now(),
  }),
  kind: 'table',
  name: 'feature_requests',
  relations: [],
  requiredColumns: ['message'],
  unique: [],
  updatedAtTrigger: true,
}

const profileImagesTable: WritableTableDefinition<'profile_images'> = {
  collection: asMockCollection(profileImages),
  defaults: () => ({
    created_at: now(),
    etag: null,
    id: crypto.randomUUID(),
    updated_at: now(),
  }),
  kind: 'table',
  name: 'profile_images',
  relations: [],
  requiredColumns: ['blur_data_url', 'height', 'path', 'source_url', 'width'],
  unique: [{ columns: ['path'], name: 'profile_images_path_key' }],
  updatedAtTrigger: true,
}

const talentsTable: WritableTableDefinition<'talents'> = {
  collection: asMockCollection(talents),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    id: crypto.randomUUID(),
    reading: null,
    status: 'active',
    theme_color: null,
    updated_at: now(),
  }),
  kind: 'table',
  name: 'talents',
  relations: [
    {
      column: 'id',
      many: true,
      referencedColumn: 'talent_id',
      table: 'youtube_channels',
    },
    {
      column: 'id',
      many: true,
      referencedColumn: 'talent_id',
      table: 'twitch_users',
    },
  ],
  requiredColumns: ['name'],
  unique: [],
  updatedAtTrigger: false,
}

const termsTable: WritableTableDefinition<'terms'> = {
  collection: asMockCollection(terms),
  defaults: () => ({
    created_at: now(),
    id: crypto.randomUUID(),
    popularity: 0,
    updated_at: now(),
  }),
  kind: 'table',
  name: 'terms',
  relations: [],
  requiredColumns: ['readings', 'synonyms', 'term'],
  unique: [{ columns: ['term'], name: 'terms_term_key' }],
  updatedAtTrigger: true,
}

const thumbnailsTable: WritableTableDefinition<'thumbnails'> = {
  collection: asMockCollection(thumbnails),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    etag: null,
    id: crypto.randomUUID(),
    updated_at: now(),
  }),
  kind: 'table',
  name: 'thumbnails',
  relations: [],
  requiredColumns: ['blur_data_url', 'height', 'path', 'width'],
  unique: [],
  updatedAtTrigger: true,
}

const twitchUsersTable: WritableTableDefinition<'twitch_users'> = {
  collection: asMockCollection(twitchUsers),
  defaults: () => ({
    id: crypto.randomUUID(),
    name: null,
    profile_image_id: null,
    twitch_login_name: null,
  }),
  kind: 'table',
  name: 'twitch_users',
  relations: [
    TALENT_RELATION,
    PROFILE_IMAGE_RELATION,
    {
      column: 'id',
      many: true,
      referencedColumn: 'twitch_user_id',
      table: 'twitch_videos',
    },
  ],
  requiredColumns: ['talent_id', 'twitch_user_id'],
  unique: [
    {
      columns: ['twitch_user_id'],
      name: 'twitch_users_twitch_user_id_key',
    },
    {
      columns: ['profile_image_id'],
      name: 'twitch_users_profile_image_id_key',
    },
  ],
  updatedAtTrigger: false,
}

const twitchVideosTable: WritableTableDefinition<'twitch_videos'> = {
  collection: asMockCollection(twitchVideos),
  defaults: () => ({
    id: crypto.randomUUID(),
    stream_id: null,
    type: null,
  }),
  kind: 'table',
  name: 'twitch_videos',
  relations: [
    VIDEO_RELATION,
    {
      column: 'twitch_user_id',
      many: false,
      referencedColumn: 'id',
      table: 'twitch_users',
    },
  ],
  requiredColumns: ['twitch_user_id', 'twitch_video_id', 'video_id'],
  unique: [
    {
      columns: ['twitch_video_id'],
      name: 'twitch_videos_twitch_video_id_key',
    },
    { columns: ['video_id'], name: 'twitch_videos_video_id_unique' },
    { columns: ['stream_id'], name: 'idx_twitch_videos_stream_id' },
  ],
  updatedAtTrigger: false,
}

const videoBackfillJobsTable: WritableTableDefinition<'video_backfill_jobs'> = {
  collection: asMockCollection(videoBackfillJobs),
  defaults: () => ({
    added: 0,
    created_at: now(),
    error: null,
    id: crypto.randomUUID(),
    pages: 0,
    requested_by: null,
    run_id: null,
    started_at: null,
  }),
  kind: 'table',
  name: 'video_backfill_jobs',
  relations: [TALENT_RELATION],
  requiredColumns: [
    'account_id',
    'finished_at',
    'platform',
    'requested_at',
    'status',
    'talent_id',
  ],
  unique: [
    {
      columns: ['platform', 'account_id', 'requested_at'],
      name: 'video_backfill_jobs_request_key',
    },
  ],
  updatedAtTrigger: false,
}

const videoBackfillLatestJobsView: ReadOnlyTableDefinition<'video_backfill_latest_jobs'> =
  {
    kind: 'view',
    name: 'video_backfill_latest_jobs',
    relations: [TALENT_RELATION],
    rows: getLatestVideoBackfillJobs,
  }

const videosTable: WritableTableDefinition<'videos'> = {
  collection: asMockCollection(videos),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    deleted_reason: null,
    id: crypto.randomUUID(),
    status: 'ENDED',
    thumbnail_id: null,
    updated_at: now(),
    video_kind: 'standard',
    visible: true,
  }),
  kind: 'table',
  name: 'videos',
  relations: [
    TALENT_RELATION,
    {
      column: 'thumbnail_id',
      many: false,
      referencedColumn: 'id',
      table: 'thumbnails',
    },
    {
      column: 'id',
      many: false,
      referencedColumn: 'video_id',
      table: 'youtube_videos',
    },
    {
      column: 'id',
      many: false,
      referencedColumn: 'video_id',
      table: 'twitch_videos',
    },
  ],
  requiredColumns: [
    'duration',
    'platform',
    'published_at',
    'talent_id',
    'title',
  ],
  unique: [],
  updatedAtTrigger: true,
}

const youtubeChannelsTable: WritableTableDefinition<'youtube_channels'> = {
  collection: asMockCollection(youtubeChannels),
  defaults: () => ({
    id: crypto.randomUUID(),
    name: null,
    profile_image_id: null,
    youtube_handle: null,
  }),
  kind: 'table',
  name: 'youtube_channels',
  relations: [TALENT_RELATION, PROFILE_IMAGE_RELATION],
  requiredColumns: ['talent_id', 'youtube_channel_id'],
  unique: [
    {
      columns: ['youtube_channel_id'],
      name: 'youtube_channels_youtube_channel_id_key',
    },
    {
      columns: ['profile_image_id'],
      name: 'youtube_channels_profile_image_id_key',
    },
  ],
  updatedAtTrigger: false,
}

const youtubeVideosTable: WritableTableDefinition<'youtube_videos'> = {
  collection: asMockCollection(youtubeVideos),
  defaults: () => ({
    id: crypto.randomUUID(),
  }),
  kind: 'table',
  name: 'youtube_videos',
  relations: [
    VIDEO_RELATION,
    {
      column: 'youtube_channel_id',
      many: false,
      referencedColumn: 'id',
      table: 'youtube_channels',
    },
  ],
  requiredColumns: ['video_id', 'youtube_channel_id', 'youtube_video_id'],
  unique: [
    { columns: ['video_id'], name: 'youtube_videos_video_id_unique' },
    {
      columns: ['youtube_video_id'],
      name: 'youtube_videos_youtube_video_id_key',
    },
  ],
  updatedAtTrigger: false,
}

/**
 * The tables (and views) that the mock serves at `/rest/v1/<name>`. Tables
 * that are not listed here, such as `audit_logs`, return no rows.
 */
export const TABLES: readonly AnyTableDefinition[] = [
  announcementsTable,
  featureRequestsTable,
  profileImagesTable,
  talentsTable,
  termsTable,
  thumbnailsTable,
  twitchUsersTable,
  twitchVideosTable,
  videoBackfillJobsTable,
  videoBackfillLatestJobsView,
  videosTable,
  youtubeChannelsTable,
  youtubeVideosTable,
]

/** The definition of a table, if the mock serves it. */
export function findTable(name: string): AnyTableDefinition | undefined {
  return TABLES.find((table) => table.name === name)
}

/** The current rows of a table. */
export async function getRows<Name extends TableName>(
  table: TableDefinition<Name>,
): Promise<Tables<Name>[]> {
  return table.kind === 'view'
    ? await table.rows()
    : table.collection.findMany()
}
