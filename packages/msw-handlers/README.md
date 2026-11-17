# @shinju-date/msw-handlers

Common mock server handlers using MSW (Mock Service Worker) for the SHINJU DATE monorepo.

This package provides a unified mock infrastructure that enables efficient development across multiple applications (`web`, `admin`, `batch`) and improves GitHub Copilot code completion accuracy by providing consistent API responses.

## Features

- **@msw/data Integration**: Structured data modeling with Standard Schema (Zod) validation
- **Built-in Query Methods**: `findMany`, `findFirst`, `create`, `update`, `delete` for data operations
- **Faker Integration**: Generates realistic, diverse mock data using `@faker-js/faker`
- **Type-Safe Collections**: All collections use Zod schemas for runtime and compile-time safety
- **Reduced Boilerplate**: 560+ lines of hardcoded data replaced with declarative schemas
- **Supabase API Mocking**: Complete mock handlers for database operations including tables, relations, and query parameters
- **Upstash Redis Mocking**: Mock handlers for Redis operations including sorted sets, pipeline commands, and basic operations
- **Node.js Support**: Runs on the server side (`setupServer()`) of the Next.js apps, in tests, and during builds
- **TypeScript Support**: Full TypeScript definitions and type safety
- **Query Parameter Support**: Handles Supabase query parameters like `select`, `eq`, `in`, `limit`, etc.

## Installation

This package is part of the SHINJU DATE monorepo and should be installed as a workspace dependency:

```json
{
  "dependencies": {
    "@shinju-date/msw-handlers": "workspace:*"
  }
}
```

Then run:

```bash
pnpm install
```

## Usage

### Using NODE_OPTIONS

To load MSW during a build, set `NODE_OPTIONS`:

```bash
NODE_OPTIONS="--import @shinju-date/msw-handlers/register" ENABLE_MSW=true pnpm run build
```

**Why NODE_OPTIONS?**

Next.js 16+ uses worker threads for parallel page generation during build. The `instrumentation.ts` file doesn't run during static page generation. Using `NODE_OPTIONS` with the `--import` flag ensures MSW is loaded in all processes and worker threads before any application code runs.

`apps/web` and `apps/admin` provide this as the `build:msw` script:

```bash
pnpm --filter @shinju-date/web build:msw
```

**Write logs to stderr, not stdout**

`NODE_OPTIONS` is inherited by child processes that Next.js spawns during build, such as `tsc --showConfig`, whose stdout is parsed as JSON. Anything this package writes to stdout breaks that parsing (`Could not parse output from TypeScript's --showConfig.`). For this reason, all Node.js diagnostic logs in this package use `console.error`. Do not add `console.log` calls.

### Next.js Apps (Server Side)

`apps/web`, `apps/admin`, and `apps/batch` start MSW from `instrumentation.ts` when `ENABLE_MSW=true`:

```typescript
// instrumentation.ts
export async function register() {
  if (process.env['ENABLE_MSW'] === 'true') {
    if (process.env['NEXT_RUNTIME'] === 'nodejs') {
      const { startServer } = await import('@shinju-date/msw-handlers/server')
      startServer()
    }
  }
}
```

The apps call Supabase, Upstash, and other services only on the server (Server Components, Server Actions, and Route Handlers), so this package does not provide a browser worker. Do not import it from client code such as `instrumentation-client.ts`; the handlers and mock data would be emitted as a client chunk.

### Node.js Environment (Testing, Batch)

For `apps/batch` and testing:

```typescript
import { server } from '@shinju-date/msw-handlers/server'

// In tests
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// For batch processing
import { startServer, stopServer } from '@shinju-date/msw-handlers/server'

startServer() // Start mocking
// Your batch logic here
stopServer() // Stop mocking
```

### Individual Handler Usage

You can also import specific handlers:

```typescript
import { supabaseHandlers, upstashHandlers } from '@shinju-date/msw-handlers'
import { setupServer } from 'msw/node'

// Use only Supabase handlers
const server = setupServer(...supabaseHandlers)

// Or mix with custom handlers
const server = setupServer(...supabaseHandlers, ...myCustomHandlers)
```

## Supported APIs

### Supabase REST API

The package mocks the following Supabase tables and operations:

#### Tables

The tables (and views) listed in `src/handlers/supabase/tables.ts` share the same handlers of PostgREST (`src/handlers/supabase/table-handlers.ts`):

- `announcements`, `feature_requests`, `profile_images`, `talents`, `terms`, `thumbnails`, `twitch_users`, `twitch_videos`, `video_backfill_jobs`, `videos`, `youtube_channels`, `youtube_videos` - read and written (GET, HEAD, POST, PATCH, DELETE)
- `video_backfill_latest_jobs` - a view, only read (GET, HEAD)

The database functions (`/rest/v1/rpc/*`) have handlers of their own in `src/handlers/supabase/rpc.ts`. Like PostgREST, a table (or view) without a definition returns 404 (`PGRST205`), and a function without a handler returns 404 (`PGRST202`), instead of an empty result.

#### Query Parameters

- `select` - Columns, aliases (`name:title`), casts (`id::text`) and embedded resources from the relations of the table definitions, such as `talent:talents!inner(id,name)`
- Filters on the columns, combined with AND. Each operator can be negated with `not.` (such as `deleted_at=not.is.null`)
- `or`, `and` - Logic trees such as `or=(deleted_at.is.null,deleted_at.gte.2026-01-01T00:00:00Z)`, which can be nested (`or=(a.eq.1,and(b.eq.2,c.eq.3))`) and negated (`not.or=(…)`). A value with commas or parentheses is quoted (`a.eq."x,y"`)
- Filters on embedded resources, such as `talents.deleted_at=is.null` or `talent.deleted_at=is.null` (by the alias). They narrow down the embedded rows; with `!inner`, the rows without a related row that matches are left out, before counting and paging
- JSON paths in the columns of filters and `order`, such as `readings->0` and `data->>name`
- `order` - Sorting, such as `published_at.desc.nullslast,id.asc`
- `limit`, `offset` - Pagination. With `Prefer: count=exact`, `Content-Range` has the number of all the matching rows, not only the page
- `on_conflict` - The columns of an upsert (`Prefer: resolution=merge-duplicates` or `resolution=ignore-duplicates`)

The filters follow the three-valued logic of SQL: a comparison with `NULL` is neither true nor false, so `id=neq.x` and `deleted_at=not.lt.x` do not match the rows where the column is `NULL`.

| Operator     | Meaning                                                      |
| ------------ | ------------------------------------------------------------ |
| `eq`, `neq`  | Equal, not equal                                             |
| `gt`, `gte`  | Greater than (or equal), compared as instants for timestamps |
| `lt`, `lte`  | Less than (or equal)                                         |
| `like`       | Pattern (`*` or `%` for any characters, `_` for one)         |
| `ilike`      | Pattern, case-insensitive                                    |
| `in`         | One of a list, such as `in.(1,2,"a,b")`                      |
| `is`         | `null`, `not_null`, `true`, `false` or `unknown`             |
| `isdistinct` | `IS DISTINCT FROM`, which treats `NULL` as a value           |

PATCH and DELETE change only the rows that match all the filters (filters on embedded resources are not supported in writes). Inserts, upserts and updates are checked against the `NOT NULL` columns and unique constraints of the table definitions, and fail with the error codes of PostgreSQL (`23502` and `23505`) without changing anything. A write that asks for a single object (`.single()`) and would not return exactly one row also changes nothing (`PGRST116`).

#### Errors for What the Mock Does Not Support

The mock does not ignore what it does not support, so that a query does not silently get a result that differs from PostgREST. It returns the errors of PostgREST (`{ code, message, details, hint }`) instead:

| Code       | Status | When                                                                                                                                                                                                                                                                                                              |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PGRST100` | 400    | An operator that is not in the table above (the message names it, such as `fts`, `cs` or `match`: the mock does not take a value of a request as a regular expression), a modifier such as `eq(any)`, a filter of another form, a spread (`...talents(name)`) in `select`, and an `order` by an embedded resource |
| `PGRST108` | 400    | A filter on a resource that is not embedded in `select`                                                                                                                                                                                                                                                           |
| `PGRST200` | 400    | An embedded resource that the table definition has no relation to                                                                                                                                                                                                                                                 |
| `PGRST202` | 404    | A function without a handler                                                                                                                                                                                                                                                                                      |
| `PGRST205` | 404    | A table without a definition                                                                                                                                                                                                                                                                                      |

When an app needs one of them, implement it in `src/handlers/supabase/query.ts` (filters and `order`) or `src/handlers/supabase/select.ts` (`select`).

#### Example Queries

```typescript
// Basic select
GET /rest/v1/videos?select=id,title

// With relations
GET /rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)

// With filters
GET /rest/v1/videos?select=*&id=in.(1,2,3)&limit=10

// With a filter on an embedded resource
GET /rest/v1/videos?select=id,talents!inner(deleted_at)&talents.deleted_at=not.is.null
```

### Upstash Redis API

The package mocks the REST API of Upstash Redis: a single command (`POST /` with `["GET", "key"]`, or `POST /v2/<command>` with the arguments), a pipeline (`POST /pipeline`) and a transaction (`POST /multi-exec`). The keys are kept in memory with their types and expiry times (`src/handlers/upstash/store.ts`), so a key expires after its TTL, and a command on a key of another type fails with `WRONGTYPE`.

#### Commands

The commands are implemented in `src/handlers/upstash/commands.ts`, with the options and the errors of Redis:

| Group       | Commands                                                                                                                                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keys        | `DEL`, `EXISTS`, `EXPIRE` (`NX`, `XX`, `GT`, `LT`), `TTL`                                                                                                                                                      |
| Strings     | `GET`, `MGET`, `SET` (`NX`, `XX`, `GET`, `EX`, `PX`, `EXAT`, `PXAT`, `KEEPTTL`), `SETEX`, `INCR`                                                                                                               |
| Lists       | `LPUSH`, `RPOP`                                                                                                                                                                                                |
| Sets        | `SADD`, `SREM`, `SMEMBERS`, `SCARD`                                                                                                                                                                            |
| Sorted sets | `ZADD` (`NX`, `XX`, `GT`, `LT`, `CH`, `INCR`), `ZINCRBY`, `ZSCORE`, `ZCARD`, `ZRANGE` (`BYSCORE`, `REV`, `LIMIT`, `WITHSCORES`), `ZUNIONSTORE` (`WEIGHTS`, `AGGREGATE`)                                        |
| Hashes      | `HINCRBY`, `HGETALL`                                                                                                                                                                                           |
| Scripts     | `EVAL` of the scripts of `@shinju-date/video-backfill` (`-- video-backfill:enqueue`, `requeue` and `run-unlock`) and of the locks of batch (`-- batch:release-lock`), emulated with the commands that they run |
| Server      | `PING`                                                                                                                                                                                                         |

A command that is not implemented returns the error of Redis, `ERR unknown command '<name>', with args beginning with: …`, with 400 (`@upstash/redis` throws it). In a pipeline, only that command gets the error; a transaction with it is discarded (`EXECABORT`), like Redis does. `EVAL` of another script also returns an error, as Lua cannot run in the mock.

`src/__tests__/upstash-commands.test.ts` finds the methods of `@upstash/redis` called in `apps/` and `packages/` (except the tests) and checks that every command of them is implemented. When an app starts to use a new command, add it to `COMMANDS` in `src/handlers/upstash/commands.ts`.

#### Example Usage

```typescript
// The handlers automatically mock calls like:
await redisClient.zrange('videos:clicked:20231023', 0, 10, {
  rev: true,
  withScores: true,
})

await redisClient.ping()
```

### Twitch API

The package mocks the app access tokens (`POST https://id.twitch.tv/oauth2/token`) and these endpoints of the Helix API:

- `GET /helix/users` - By `id` or `login`
- `GET /helix/videos` - By `id` (404 when one of them does not exist, like Helix), or by `user_id` with `type`, `first` and `after`, newest first
- `GET /helix/streams` - The broadcasts on air, by `user_id` or `user_login`
- `GET /helix/clips` - By `id` (the clips that do not exist are left out) or by `broadcaster_id`

The videos, streams and clips come from the Twitch videos of the Supabase mock (`twitch_videos` with their `videos` and `twitch_users`): the archives, highlights and uploads are videos, the `LIVE` video is a stream, and the clip is a clip. The thumbnails and the icons that they link to are served as well.

## Mock Data

### Sample Videos

```typescript
;[
  {
    id: 'video-uuid-1',
    title: 'Sample Video 1',
    duration: 'PT10M30S',
    talent_id: 'talent-uuid-1',
    thumbnail_id: 'thumb-uuid-1',
    visible: true,
  },
  // ...more videos
]
```

### Sample Redis Data

`createRedisDataFactory()` (`src/redis-factory.ts`) generates the click data of the last 7 days, up to today in `TIME_ZONE`. The date keys are made with `formatDateKey()` like the apps do. The members are the IDs of the visible videos and their talents in the Supabase mock, so the apps can look them up:

```typescript
// Click tracking data (video ID / talent ID => clicks)
'videos:clicked:20231023' => [{ member: '<video ID>', score: 150 }, ...]
'channels:clicked:20231023' => [{ member: '<talent ID>', score: 200 }, ...]
```

The clicks of a talent are the sum of the clicks of their videos.

## Mock Data Generation with @msw/data and @faker-js/faker

This package uses **@msw/data** v1.1.2 for structured data modeling combined with **@faker-js/faker** for realistic data generation.

### Why @msw/data?

`@msw/data` provides:

- **Structured Database Modeling**: Define schemas with relationships
- **Built-in Query Methods**: `findMany`, `findFirst`, `update`, `delete`, etc.
- **Native Relation API**: Automatic relation traversal using `.relate()` method
- **Automatic Foreign Key Resolution**: No manual `find()` operations needed
- **Type Safety**: Full TypeScript support with proper typing

Combined with `@faker-js/faker`, you get:

- **Realistic Data**: Diverse, random values for names, dates, UUIDs, etc.
- **Dynamic Generation**: Each test run uses different data
- **Maintainability**: Schema changes propagate automatically

### Using the Database

The package exports a pre-configured `@mswjs/data` database with all tables:

```typescript
import { db } from '@shinju-date/msw-handlers'

// Query videos using findMany
const visibleVideos = db.videos.findMany({
  where: {
    visible: { equals: true },
    deleted_at: { equals: null },
  },
})

// Find a specific talent
const talent = db.talents.findFirst({
  where: { id: { equals: 'some-talent-id' } },
})

// Create new data
const newVideo = db.videos.create({
  title: 'Custom Video',
  status: 'PUBLISHED',
  visible: true,
})

// Update existing data
const updated = db.videos.update({
  where: { id: { equals: videoId } },
  data: { title: 'Updated Title' },
})

// Delete data
db.videos.delete({
  where: { id: { equals: videoId } },
})

// Get all records
const allTalents = db.videos.getAll()
```

### Database Schema

The database includes the following tables:

- `talents`: Creator/talent information
- `videos`: Video records with status and metadata
- `thumbnails`: Thumbnail images with blur data
- `youtube_channels`: YouTube channel information (all but one channel have a `profile_image_id`)
- `twitch_users`: Twitch user information (two users, one of them with a `profile_image_id`)
- `profile_images`: Square icons referenced by `youtube_channels.profile_image_id` and `twitch_users.profile_image_id`
- `youtube_videos`: YouTube video relation mapping
- `twitch_videos`: Twitch video relation mapping (upcoming, live, archive, clip, highlight and upload videos of both Twitch users)
- `terms`: Search terms and synonyms
- `announcements`: System announcements

Each table is populated with realistic faker-generated data on initialization.

### Resetting the Database

To reset the database to its initial state:

```typescript
import { seedDatabase } from '@shinju-date/msw-handlers'

// Clear and reseed all data
seedDatabase()
```

### Using the Collections with Native Relations

The package exports `@msw/data` collections with native relation support:

```typescript
import { videos, talents, seedCollections } from '@shinju-date/msw-handlers'

// Initialize collections (automatically defines relations)
await seedCollections()

// Query videos
const publishedVideos = await videos.findMany((q) => q.where({ visible: true }))

// Access related data directly via native relation traversal
const firstVideo = publishedVideos[0]
console.log(firstVideo.talent.name) // Talent name - no manual find() needed!
console.log(firstVideo.thumbnail.path) // Thumbnail path - automatic resolution!

// Create new video (relations work automatically)
const newVideo = await videos.create({
  title: 'New Video',
  talent_id: 'some-talent-id',
  thumbnail_id: 'some-thumbnail-id',
  // ... other fields
})

// Update video
await videos.update((q) => q.where({ id: newVideo.id }), {
  data(record) {
    record.title = 'Updated Title'
    return record
  },
})
```

### Relation Configuration

Relations are automatically configured using `@msw/data`'s `.relate()` method:

```typescript
// Many-to-one relations
videos.relate('talent', talents, {
  field: 'talent_id',
  foreignKey: 'id',
  type: 'one-of',
})

videos.relate('thumbnail', thumbnails, {
  field: 'thumbnail_id',
  foreignKey: 'id',
  type: 'one-of',
})

// One-to-many relations
talents.relate('videos', videos, {
  field: 'id',
  foreignKey: 'talent_id',
  type: 'many-of',
})
```

Benefits:

- **No Manual Lookups**: No need for `.find()` operations
- **Type-Safe**: Relations maintain TypeScript types
- **Automatic Resolution**: Foreign keys resolve automatically
- **Bi-Directional**: Access relations from either side

### Database Schema

The database includes the following tables:

- `talents`: Creator/talent information
- `videos`: Video records with status and metadata
- `thumbnails`: Thumbnail images with blur data
- `youtubeChannels`: YouTube channel information
- `youtubeVideos`: YouTube video relation mapping
- `twitchVideos`: Twitch video relation mapping
- `terms`: Search terms and synonyms
- `announcements`: System announcements

Each table is populated with realistic faker-generated data on initialization.

### Available Collections

The package exports the following `@msw/data` collections:

#### Supabase Tables

- `talents` - Talent/VTuber information
- `videos` - Video records with metadata (relates to talent, thumbnail)
- `thumbnails` - Thumbnail images with blur data
- `youtubeChannels` - YouTube channel information (relates to talent)
- `youtubeVideos` - YouTube video relations (relates to video)
- `twitchUsers` - Twitch user information (relates to talent)
- `twitchVideos` - Twitch video relations (relates to video and Twitch user)
- `terms` - Search terms and synonyms
- `announcements` - System announcements

#### Seeding & Relations

- `seedCollections()` - Initialize all collections with faker-generated data
- `defineCollectionRelations()` - Configure relations (called automatically by seedCollections)

#### Usage Example

```typescript
import { videos, talents, seedCollections } from '@shinju-date/msw-handlers'

// Initialize collections (relations configured automatically)
await seedCollections()

// Query videos
const publishedVideos = await videos.findMany((q) => q.where({ visible: true }))

// Get first video by ID
const video = await videos.findFirst((q) => q.where({ id: 'some-uuid' }))

// Create new video
await videos.create({
  title: 'New Video',
  duration: 'PT1H30M',
  published_at: new Date().toISOString(),
  status: 'PUBLISHED',
  visible: true,
  platform: 'YOUTUBE',
  talent_id: 'talent-uuid',
  thumbnail_id: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  deleted_at: null,
})

// Update video
await videos.update((q) => q.where({ id: 'some-uuid' }), {
  data(video) {
    video.title = 'Updated Title'
  },
})

// Delete video
await videos.delete((q) => q.where({ id: 'some-uuid' }))
```

### Code Reduction Achieved

By using `@msw/data` with Zod schemas, we've significantly reduced boilerplate:

- **Supabase handlers**: Reduced by 470+ lines (from hardcoded arrays to collection queries)
- **upstash.ts**: Reduced by 90+ lines (simplified with faker-based factory)
- **Total**: 560+ lines of hardcoded mock data eliminated

## Adding New Mock Data

### Extending Supabase Mocks

To add new tables or modify existing data:

1. **Add Zod schema to collections** in `src/collections.ts`:

```typescript
import { Collection } from '@msw/data'
import { z } from 'zod'
import { faker } from '@faker-js/faker'

// Define your collection
export const myTable = new Collection({
  schema: z.object({
    id: z.string().uuid(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
})

// Add seeding logic in seedCollections()
export async function seedCollections() {
  // ... existing seeds

  // Seed your table
  await myTable.createMany(10, (index) => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    created_at: faker.date.past().toISOString(),
    updated_at: faker.date.recent().toISOString(),
  }))
}
```

2. **Export the collection** in `src/index.ts`:

```typescript
export { myTable } from './collections.js'
```

3. **Add a table definition** to `TABLES` in `src/handlers/supabase/tables.ts`. The table then gets the GET, HEAD, POST, PATCH and DELETE handlers:

```typescript
const myTable: WritableTableDefinition<'my_table'> = {
  collection: asMockCollection(myTableCollection),
  // The columns that have defaults (or are nullable)
  defaults: () => ({
    created_at: now(),
    id: crypto.randomUUID(),
    updated_at: now(),
  }),
  kind: 'table',
  name: 'my_table',
  // Every `NOT NULL` column, with or without a default (the type checks
  // that none is missing)
  notNullColumns: notNullColumns<'my_table'>({
    created_at: true,
    id: true,
    name: true,
    talent_id: true,
    updated_at: true,
  }),
  // Embedded resources that `select` can resolve, such as `talents(name)`
  relations: [
    {
      column: 'talent_id',
      many: false,
      referencedColumn: 'id',
      table: 'talents',
    },
  ],
  // Unique constraints other than the primary key (`id`)
  unique: [{ columns: ['name'], name: 'my_table_name_key' }],
  // Whether a trigger sets `updated_at` when a row is updated
  updatedAtTrigger: true,
}
```

A view is defined with `kind: 'view'` and a `rows` function instead of a collection, and is only read.

### Extending Redis Mocks

To add new Redis data types:

1. **Edit `src/redis-factory.ts`**:

```typescript
// Add new data type in createRedisDataFactory()
redisData.set('my:custom:key', faker.lorem.words())
```

2. **Or create custom data**:

```typescript
import { createCustomRedisData } from './factories'

const customData = createCustomRedisData({
  'my:key': 'my value',
  'another:key': { complex: 'object' },
})
```

## Development

### Building

```bash
pnpm run build
```

### Linting

```bash
pnpm run check --fix
```

### Testing

```bash
pnpm run test
```

## Integration Examples

### Next.js App Router

See [Next.js Apps (Server Side)](#nextjs-apps-server-side). MSW starts from `instrumentation.ts`, not from a layout or a client component.

### Vitest Tests

```typescript
// vitest.setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from '@shinju-date/msw-handlers/server'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### GitHub Copilot Enhancement

With consistent mock responses, GitHub Copilot can provide more accurate completions:

```typescript
// Copilot will understand the data structure from mocks
const { data: videos } = await supabase
  .from('videos')
  .select('id, title, thumbnails(path, blur_data_url)')
  .limit(10)

// Now Copilot knows 'videos' has the expected structure
videos?.forEach((video) => {
  console.log(video.title) // ✅ Copilot suggests 'title'
  console.log(video.thumbnails?.path) // ✅ Copilot suggests nested structure
})
```

## Troubleshooting

### MSW Not Starting

If `🚀 MSW server started` doesn't appear in the terminal (stderr):

1. Make sure `ENABLE_MSW=true` is set
2. Make sure this package is built (`pnpm run build`)
3. For builds, make sure `NODE_OPTIONS="--import @shinju-date/msw-handlers/register"` is set (or use `build:msw`)

MSW does not run in the browser, so nothing is printed to the browser console.

### Mock Data Not Matching

If mock responses don't match your expectations:

1. Check the query parameters being sent
2. Verify the mock data structure matches your database schema
3. Add `console.error` statements in handlers for debugging (not `console.log`; see above)

### TypeScript Errors

If you get TypeScript errors:

1. Ensure your app's TypeScript version is compatible
2. Check that the database types are properly imported
3. Verify MSW types are correctly installed

## Contributing

When adding new handlers or modifying existing ones:

1. **Follow the existing patterns** for consistency
2. **Add TypeScript types** where possible
3. **Update the README** with new functionality
4. **Test your changes** with the tests and with `ENABLE_MSW=true` in an app
5. **Run linting** with `pnpm run check --fix`

## License

MIT
