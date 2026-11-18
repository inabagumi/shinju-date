import type Database from "@shinju-date/database";
import type { Tables, TablesInsert } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";

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
} from "../../collections.js";

type PublicSchema = Database["public"];

/** The name of a table (or view) of the public schema. */
export type TableName =
  | keyof PublicSchema["Tables"]
  | keyof PublicSchema["Views"];

/** The name of a table, which can be written to unlike a view. */
export type WritableTableName = keyof PublicSchema["Tables"];

/** A column of a table (of any of the tables, when `Name` is a union). */
type Column<Name extends TableName> = Name extends TableName
  ? keyof Tables<Name> & string
  : never;

/**
 * The part of an `@msw/data` collection that the handlers use. `Rec` is the
 * type of the records that the collection holds (inferred from `findMany`):
 * `update` and `delete` take the records as `findMany` returned them, not
 * copies of them.
 */
export interface MockCollection<Row, Rec extends Row = Row> {
  create(values: Row): Promise<NoInfer<Rec>>;
  delete(record: NoInfer<Rec>): unknown;
  findMany(): Rec[];
  update(
    record: NoInfer<Rec>,
    options: { data(draft: Row): void }
  ): Promise<NoInfer<Rec> | undefined>;
}

/**
 * Check that a collection holds the rows of a table, so that it can be used
 * as a `MockCollection` of them.
 */
const asMockCollection = <Row, Rec extends Row>(
  collection: MockCollection<NoInfer<Row>, Rec>
): MockCollection<Row> => collection;

/**
 * A relation that `select` can embed, such as `talent:talents(id,name)`. The
 * rows of `table` whose `referencedColumn` equals `column` of this table are
 * embedded: an array of them when `many` is true, or the first of them (or
 * `null`) otherwise.
 */
export type RelationDefinition<Name extends TableName> = {
  [Target in TableName]: {
    column: Column<Name>;
    many: boolean;
    referencedColumn: Column<Target>;
    table: Target;
  };
}[TableName];

/** A unique constraint, which inserts, upserts and updates are checked against. */
export interface UniqueConstraint<Name extends TableName> {
  columns: readonly Column<Name>[];
  name: string;
}

/**
 * The columns that are `NOT NULL` and have no defaults, which an insert has
 * to give (the columns that are not optional in `TablesInsert`).
 */
type RequiredColumn<Name extends TableName> = Name extends WritableTableName
  ? {
      [
        Key in keyof TablesInsert<Name>
      ]-?: undefined extends TablesInsert<Name>[Key] ? never : Key;
    }[keyof TablesInsert<Name>] &
      Column<Name>
  : never;

/** The columns that are `NOT NULL`, with or without defaults. */
type NotNullColumn<Name extends TableName> = Name extends TableName
  ? {
      [Key in keyof Tables<Name> & string]: null extends Tables<Name>[Key]
        ? never
        : Key;
    }[keyof Tables<Name> & string]
  : never;

/**
 * List the `NOT NULL` columns of a table. The type of the argument checks
 * that every such column is listed.
 */
const notNullColumns = <Name extends WritableTableName>(
  columns: Record<NotNullColumn<Name>, true>
): readonly NotNullColumn<Name>[] =>
  Object.keys(columns) as NotNullColumn<Name>[];

interface BaseTableDefinition<Name extends TableName> {
  name: Name;
  relations: readonly RelationDefinition<Name>[];
  /**
   * The columns of the `uuid` type, whose values `eq`, `neq`, `in` and
   * `isdistinct` compare regardless of case as PostgreSQL does. The types of
   * the tables give them as `string`, so they are listed by hand.
   */
  uuidColumns: readonly Column<Name>[];
}

/** A table that is read and written through a mock collection. */
export interface WritableTableDefinition<
  Name extends TableName,
> extends BaseTableDefinition<Name> {
  collection: MockCollection<Tables<Name>>;
  /** The values of the columns that have defaults (or are nullable). */
  defaults: () => Omit<Tables<Name>, RequiredColumn<Name>>;
  kind: "table";
  /**
   * The columns that are `NOT NULL`, which inserts, upserts and updates are
   * checked against (made with `notNullColumns`).
   */
  notNullColumns: readonly NotNullColumn<Name>[];
  /** Unique constraints other than the primary key (`id`). */
  unique: readonly UniqueConstraint<Name>[];
  /**
   * Whether a trigger (`handle_updated_at`) sets `updated_at` to the current
   * time when a row is updated.
   */
  updatedAtTrigger: boolean;
}

/** A view, which the mock only reads. */
export interface ReadOnlyTableDefinition<
  Name extends TableName,
> extends BaseTableDefinition<Name> {
  kind: "view";
  rows: () => Promise<Tables<Name>[]>;
}

export type TableDefinition<Name extends TableName> =
  | WritableTableDefinition<Name>
  | ReadOnlyTableDefinition<Name>;

/** A table definition of any table. */
export type AnyTableDefinition = {
  [Name in TableName]: TableDefinition<Name>;
}[TableName];

/** The current time as it is saved in a `TIMESTAMPTZ` column. */
const now = (): string => toDBString(Temporal.Now.instant());

/**
 * Parse a `TIMESTAMPTZ` value like PostgreSQL does. A value without an offset
 * is in the time zone of the session, which is UTC on Supabase.
 */
const parseTimestamp = (text: string): Temporal.Instant | null => {
  try {
    return Temporal.Instant.from(text);
  } catch {
    try {
      return Temporal.PlainDateTime.from(text)
        .toZonedDateTime("UTC")
        .toInstant();
    } catch {
      return null;
    }
  }
};

/**
 * Compare two `TIMESTAMPTZ` values as instants. Values that cannot be parsed
 * come before the others, so in descending order (the latest first) they
 * come last and are never picked as the latest.
 */
const compareTimestamps = (a: string, b: string): number => {
  const instantA = parseTimestamp(a);
  const instantB = parseTimestamp(b);

  if (instantA === null || instantB === null) {
    return Number(instantA !== null) - Number(instantB !== null);
  }

  return Temporal.Instant.compare(instantA, instantB);
};

/**
 * Mirrors the `video_backfill_latest_jobs` view: the latest finished job of
 * each account that still exists, of talents that are not deleted.
 */
const getLatestVideoBackfillJobs = async (): Promise<
  Tables<"video_backfill_latest_jobs">[]
> => {
  const talentIds = new Set(
    talents
      .findMany()
      .filter((talent) => talent.deleted_at === null)
      .map((talent) => talent.id)
  );
  const accountIds = {
    twitch: new Set(twitchUsers.findMany().map((user) => user.id)),
    youtube: new Set(youtubeChannels.findMany().map((channel) => channel.id)),
  };
  const seen = new Set<string>();

  return videoBackfillJobs
    .findMany()
    .toSorted((a, b) => compareTimestamps(b.finished_at, a.finished_at))
    .filter((job) => {
      const key = `${job.platform}:${job.account_id}`;

      if (
        seen.has(key) ||
        !talentIds.has(job.talent_id) ||
        !accountIds[job.platform].has(job.account_id)
      ) {
        return false;
      }

      seen.add(key);

      return true;
    });
};

/** A relation to `talents` from its `talent_id`. */
const TALENT_RELATION = {
  column: "talent_id",
  many: false,
  referencedColumn: "id",
  table: "talents",
} as const;

/** A relation to `profile_images` from its `profile_image_id`. */
const PROFILE_IMAGE_RELATION = {
  column: "profile_image_id",
  many: false,
  referencedColumn: "id",
  table: "profile_images",
} as const;

/** A relation to `videos` from its `video_id`. */
const VIDEO_RELATION = {
  column: "video_id",
  many: false,
  referencedColumn: "id",
  table: "videos",
} as const;

/**
 * The `uuid` columns of `video_backfill_jobs`, which the
 * `video_backfill_latest_jobs` view has as well.
 */
const VIDEO_BACKFILL_JOB_UUID_COLUMNS = [
  "account_id",
  "id",
  "requested_by",
  "run_id",
  "talent_id",
] as const;

const announcementsTable: WritableTableDefinition<"announcements"> = {
  collection: asMockCollection(announcements),
  defaults: () => ({
    created_at: now(),
    enabled: false,
    id: crypto.randomUUID(),
    level: "info",
    updated_at: now(),
  }),
  kind: "table",
  name: "announcements",
  notNullColumns: notNullColumns<"announcements">({
    created_at: true,
    enabled: true,
    end_at: true,
    id: true,
    level: true,
    message: true,
    start_at: true,
    updated_at: true,
  }),
  relations: [],
  unique: [],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const featureRequestsTable: WritableTableDefinition<"feature_requests"> = {
  collection: asMockCollection(featureRequests),
  defaults: () => ({
    admin_memo: null,
    created_at: now(),
    id: crypto.randomUUID(),
    is_read: false,
    status: "pending",
    updated_at: now(),
  }),
  kind: "table",
  name: "feature_requests",
  notNullColumns: notNullColumns<"feature_requests">({
    created_at: true,
    id: true,
    is_read: true,
    message: true,
    status: true,
    updated_at: true,
  }),
  relations: [],
  unique: [],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const profileImagesTable: WritableTableDefinition<"profile_images"> = {
  collection: asMockCollection(profileImages),
  defaults: () => ({
    created_at: now(),
    etag: null,
    id: crypto.randomUUID(),
    updated_at: now(),
  }),
  kind: "table",
  name: "profile_images",
  notNullColumns: notNullColumns<"profile_images">({
    blur_data_url: true,
    created_at: true,
    height: true,
    id: true,
    path: true,
    source_url: true,
    updated_at: true,
    width: true,
  }),
  relations: [],
  unique: [{ columns: ["path"], name: "profile_images_path_key" }],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const talentsTable: WritableTableDefinition<"talents"> = {
  collection: asMockCollection(talents),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    id: crypto.randomUUID(),
    reading: null,
    status: "active",
    theme_color: null,
    updated_at: now(),
  }),
  kind: "table",
  name: "talents",
  notNullColumns: notNullColumns<"talents">({
    created_at: true,
    id: true,
    name: true,
    status: true,
    updated_at: true,
  }),
  relations: [
    {
      column: "id",
      many: true,
      referencedColumn: "talent_id",
      table: "youtube_channels",
    },
    {
      column: "id",
      many: true,
      referencedColumn: "talent_id",
      table: "twitch_users",
    },
  ],
  unique: [],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const termsTable: WritableTableDefinition<"terms"> = {
  collection: asMockCollection(terms),
  defaults: () => ({
    created_at: now(),
    id: crypto.randomUUID(),
    popularity: 0,
    updated_at: now(),
  }),
  kind: "table",
  name: "terms",
  notNullColumns: notNullColumns<"terms">({
    created_at: true,
    id: true,
    popularity: true,
    readings: true,
    synonyms: true,
    term: true,
    updated_at: true,
  }),
  relations: [],
  unique: [{ columns: ["term"], name: "terms_term_key" }],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const thumbnailsTable: WritableTableDefinition<"thumbnails"> = {
  collection: asMockCollection(thumbnails),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    etag: null,
    id: crypto.randomUUID(),
    updated_at: now(),
  }),
  kind: "table",
  name: "thumbnails",
  notNullColumns: notNullColumns<"thumbnails">({
    blur_data_url: true,
    created_at: true,
    height: true,
    id: true,
    path: true,
    updated_at: true,
    width: true,
  }),
  relations: [],
  unique: [],
  updatedAtTrigger: true,
  uuidColumns: ["id"],
};

const twitchUsersTable: WritableTableDefinition<"twitch_users"> = {
  collection: asMockCollection(twitchUsers),
  defaults: () => ({
    id: crypto.randomUUID(),
    name: null,
    profile_image_id: null,
    twitch_login_name: null,
  }),
  kind: "table",
  name: "twitch_users",
  notNullColumns: notNullColumns<"twitch_users">({
    id: true,
    talent_id: true,
    twitch_user_id: true,
  }),
  relations: [
    TALENT_RELATION,
    PROFILE_IMAGE_RELATION,
    {
      column: "id",
      many: true,
      referencedColumn: "twitch_user_id",
      table: "twitch_videos",
    },
  ],
  unique: [
    {
      columns: ["twitch_user_id"],
      name: "twitch_users_twitch_user_id_key",
    },
    {
      columns: ["profile_image_id"],
      name: "twitch_users_profile_image_id_key",
    },
  ],
  updatedAtTrigger: false,
  uuidColumns: ["id", "profile_image_id", "talent_id"],
};

const twitchVideosTable: WritableTableDefinition<"twitch_videos"> = {
  collection: asMockCollection(twitchVideos),
  defaults: () => ({
    id: crypto.randomUUID(),
    stream_id: null,
    type: null,
  }),
  kind: "table",
  name: "twitch_videos",
  notNullColumns: notNullColumns<"twitch_videos">({
    id: true,
    twitch_user_id: true,
    twitch_video_id: true,
    video_id: true,
  }),
  relations: [
    VIDEO_RELATION,
    {
      column: "twitch_user_id",
      many: false,
      referencedColumn: "id",
      table: "twitch_users",
    },
  ],
  unique: [
    {
      columns: ["twitch_video_id"],
      name: "twitch_videos_twitch_video_id_key",
    },
    { columns: ["video_id"], name: "twitch_videos_video_id_unique" },
    { columns: ["stream_id"], name: "idx_twitch_videos_stream_id" },
  ],
  updatedAtTrigger: false,
  uuidColumns: ["id", "twitch_user_id", "video_id"],
};

const videoBackfillJobsTable: WritableTableDefinition<"video_backfill_jobs"> = {
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
  kind: "table",
  name: "video_backfill_jobs",
  notNullColumns: notNullColumns<"video_backfill_jobs">({
    account_id: true,
    added: true,
    created_at: true,
    finished_at: true,
    id: true,
    pages: true,
    platform: true,
    requested_at: true,
    status: true,
    talent_id: true,
  }),
  relations: [TALENT_RELATION],
  unique: [
    {
      columns: ["platform", "account_id", "requested_at"],
      name: "video_backfill_jobs_request_key",
    },
  ],
  updatedAtTrigger: false,
  uuidColumns: VIDEO_BACKFILL_JOB_UUID_COLUMNS,
};

const videoBackfillLatestJobsView: ReadOnlyTableDefinition<"video_backfill_latest_jobs"> =
  {
    kind: "view",
    name: "video_backfill_latest_jobs",
    relations: [TALENT_RELATION],
    rows: getLatestVideoBackfillJobs,
    uuidColumns: VIDEO_BACKFILL_JOB_UUID_COLUMNS,
  };

export const videosTable: WritableTableDefinition<"videos"> = {
  collection: asMockCollection(videos),
  defaults: () => ({
    created_at: now(),
    deleted_at: null,
    deleted_reason: null,
    id: crypto.randomUUID(),
    status: "ENDED",
    thumbnail_id: null,
    updated_at: now(),
    video_kind: "standard",
    visible: true,
  }),
  kind: "table",
  name: "videos",
  notNullColumns: notNullColumns<"videos">({
    created_at: true,
    duration: true,
    id: true,
    platform: true,
    published_at: true,
    status: true,
    talent_id: true,
    title: true,
    updated_at: true,
    video_kind: true,
    visible: true,
  }),
  relations: [
    TALENT_RELATION,
    {
      column: "thumbnail_id",
      many: false,
      referencedColumn: "id",
      table: "thumbnails",
    },
    {
      column: "id",
      many: false,
      referencedColumn: "video_id",
      table: "youtube_videos",
    },
    {
      column: "id",
      many: false,
      referencedColumn: "video_id",
      table: "twitch_videos",
    },
  ],
  unique: [],
  updatedAtTrigger: true,
  uuidColumns: ["id", "talent_id", "thumbnail_id"],
};

const youtubeChannelsTable: WritableTableDefinition<"youtube_channels"> = {
  collection: asMockCollection(youtubeChannels),
  defaults: () => ({
    id: crypto.randomUUID(),
    name: null,
    profile_image_id: null,
    youtube_handle: null,
  }),
  kind: "table",
  name: "youtube_channels",
  notNullColumns: notNullColumns<"youtube_channels">({
    id: true,
    talent_id: true,
    youtube_channel_id: true,
  }),
  relations: [TALENT_RELATION, PROFILE_IMAGE_RELATION],
  unique: [
    {
      columns: ["youtube_channel_id"],
      name: "youtube_channels_youtube_channel_id_key",
    },
    {
      columns: ["profile_image_id"],
      name: "youtube_channels_profile_image_id_key",
    },
  ],
  updatedAtTrigger: false,
  uuidColumns: ["id", "profile_image_id", "talent_id"],
};

const youtubeVideosTable: WritableTableDefinition<"youtube_videos"> = {
  collection: asMockCollection(youtubeVideos),
  defaults: () => ({
    id: crypto.randomUUID(),
  }),
  kind: "table",
  name: "youtube_videos",
  notNullColumns: notNullColumns<"youtube_videos">({
    id: true,
    video_id: true,
    youtube_channel_id: true,
    youtube_video_id: true,
  }),
  relations: [
    VIDEO_RELATION,
    {
      column: "youtube_channel_id",
      many: false,
      referencedColumn: "id",
      table: "youtube_channels",
    },
  ],
  unique: [
    { columns: ["video_id"], name: "youtube_videos_video_id_unique" },
    {
      columns: ["youtube_video_id"],
      name: "youtube_videos_youtube_video_id_key",
    },
  ],
  updatedAtTrigger: false,
  uuidColumns: ["id", "video_id", "youtube_channel_id"],
};

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
];

/** The definition of a table, if the mock serves it. */
export const findTable = (name: string): AnyTableDefinition | undefined =>
  TABLES.find((table) => table.name === name);

/** The current rows of a table. */
export const getRows = async <Name extends TableName>(
  table: TableDefinition<Name>
): Promise<Tables<Name>[]> =>
  table.kind === "view" ? await table.rows() : table.collection.findMany();
