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
- **Browser & Node.js Support**: Works in both browser (Service Worker) and Node.js (server) environments
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

### Option 1: Using experimental.adapterPath (Recommended)

Use Next.js's deployment adapter system to configure MSW:

**In your `next.config.ts`:**

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    adapterPath: import.meta.resolve('@shinju-date/msw-handlers/adapter'),
  },
  // ... other config
}

export default nextConfig
```

**Then just set environment variable:**

```bash
ENABLE_MSW=true pnpm run build
ENABLE_MSW=true pnpm run dev
```

The adapter automatically configures `NODE_OPTIONS` when MSW is enabled, ensuring MSW is loaded in all processes and worker threads.

### Option 2: Using NODE_OPTIONS directly

For more explicit control, set `NODE_OPTIONS` manually:

```bash
NODE_OPTIONS="--import @shinju-date/msw-handlers/register" ENABLE_MSW=true pnpm run build
```

**Why NODE_OPTIONS?**

Next.js 16+ uses worker threads for parallel page generation during build. The `instrumentation.ts` file doesn't run during static page generation. Using `NODE_OPTIONS` with the `--import` flag ensures MSW is loaded in all processes and worker threads before any application code runs.

### Browser Environment (React Components)

For `apps/web` and `apps/admin`:

1. **Install MSW in your app** (if not already installed):

```bash
pnpm add -D msw
```

2. **Setup MSW in your app**:

Create `lib/msw.ts`:

```typescript
import { setupWorker } from 'msw/browser'
import { allHandlers } from '@shinju-date/msw-handlers'

export const worker = setupWorker(...allHandlers)

// Start the worker in development
if (process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
  })
}
```

3. **Initialize in your app**:

In your `app/layout.tsx` or `_app.tsx`:

```typescript
// Only in development
if (process.env.NODE_ENV === 'development') {
  import('./lib/msw')
}
```

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
import { setupWorker } from 'msw/browser'

// Use only Supabase handlers
const worker = setupWorker(...supabaseHandlers)

// Or mix with custom handlers
const worker = setupWorker(...supabaseHandlers, ...myCustomHandlers)
```

## Supported APIs

### Supabase REST API

The package mocks the following Supabase tables and operations:

#### Tables
- `videos` - Video content with title, duration, etc.
- `channels` - Channel information with name
- `thumbnails` - Thumbnail images with blur data URLs
- `terms` - Search terms with readings and synonyms

#### Query Parameters
- `select` - Column selection (supports nested relations)
- `eq` - Equality filters
- `in` - Array inclusion filters
- `limit` - Result limiting
- `offset` - Result pagination

#### Example Queries

```typescript
// Basic select
GET /rest/v1/videos?select=id,title

// With relations
GET /rest/v1/videos?select=id,title,thumbnails(path,blur_data_url)

// With filters
GET /rest/v1/videos?select=*&id.in.(1,2,3)&limit=10
```

### Upstash Redis API

The package mocks the following Redis operations:

#### Commands
- `ZRANGE` - Get sorted set ranges (with scores, reverse order)
- `ZUNIONSTORE` - Union multiple sorted sets
- `PING` - Connection health check
- `GET/SET` - Basic key-value operations
- `EXPIRE` - Set key expiration

#### Pipeline Support
- Multiple commands in a single request
- Transaction-like behavior

#### Example Usage

```typescript
// The handlers automatically mock calls like:
await redisClient.zrange('videos:clicked:2023-10-23', 0, 10, {
  rev: true,
  withScores: true
})

await redisClient.ping()
```

## Mock Data

### Sample Videos
```typescript
[
  {
    id: 'video-uuid-1',
    title: 'Sample Video 1',
    duration: 'PT10M30S',
    talent_id: 'talent-uuid-1',
    thumbnail_id: 'thumb-uuid-1',
    visible: true
  },
  // ...more videos
]
```

### Sample Redis Data
```typescript
// Click tracking data
'videos:clicked:2023-10-23' => [{ member: '1', score: 150 }, ...]
'channels:clicked:2023-10-23' => [{ member: '1', score: 200 }, ...]

// Search popularity
'search:popular:daily:2023-10-23' => [{ member: 'ホロライブ', score: 50 }, ...]
```

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
    deleted_at: { equals: null }
  }
})

// Find a specific talent
const talent = db.talents.findFirst({
  where: { id: { equals: 'some-talent-id' } }
})

// Create new data
const newVideo = db.videos.create({
  title: 'Custom Video',
  status: 'PUBLISHED',
  visible: true
})

// Update existing data
const updated = db.videos.update({
  where: { id: { equals: videoId } },
  data: { title: 'Updated Title' }
})

// Delete data
db.videos.delete({
  where: { id: { equals: videoId } }
})

// Get all records
const allTalents = db.videos.getAll()
```

### Database Schema

The database includes the following tables:
- `talents`: Creator/talent information
- `videos`: Video records with status and metadata
- `thumbnails`: Thumbnail images with blur data
- `youtube_channels`: YouTube channel information
- `youtube_videos`: YouTube video relation mapping
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
const publishedVideos = await videos.findMany((q) =>
  q.where({ visible: true })
)

// Access related data directly via native relation traversal
const firstVideo = publishedVideos[0]
console.log(firstVideo.talent.name)       // Talent name - no manual find() needed!
console.log(firstVideo.thumbnail.path)    // Thumbnail path - automatic resolution!

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
  }
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
const publishedVideos = await videos.findMany((q) =>
  q.where({ visible: true })
)

// Get first video by ID
const video = await videos.findFirst((q) =>
  q.where({ id: 'some-uuid' })
)

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
- **supabase.ts**: Reduced by 470+ lines (from hardcoded arrays to collection queries)
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

3. **Use in handlers** in `src/handlers/supabase.ts`:

```typescript
import { myTable } from '../collections.js'

// Initialize
await seedCollections()
const mockMyTable = await myTable.findMany()
}
```

2. **Export from `src/factories/index.ts`**:

```typescript
export {
  createMyTableFactory,
  createManyMyTable,
} from './supabase/my-table.js'
```

3. **Use in handler** (`src/handlers/supabase.ts`):

```typescript
import { createManyMyTable } from '../factories/index.js'

const mockMyTable = createManyMyTable(10)

// Add new handler
http.get('*/rest/v1/my_table', ({ request }) => {
  const url = new URL(request.url)
  const query = parseSupabaseQuery(url)

  let filteredData = applySupabaseFilters(mockMyTable, query)
  filteredData = applySelect(filteredData, query.select)

  return HttpResponse.json(filteredData)
})
```

### Extending Redis Mocks

To add new Redis data types:

1. **Edit `src/factories/upstash/redis-data.ts`**:

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

```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Initialize MSW in development
  if (process.env.NODE_ENV === 'development') {
    import('@/lib/msw')
  }

  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
```

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
videos?.forEach(video => {
  console.log(video.title) // ✅ Copilot suggests 'title'
  console.log(video.thumbnails?.path) // ✅ Copilot suggests nested structure
})
```

## Troubleshooting

### MSW Not Starting

If MSW doesn't start in the browser:

1. Make sure the service worker is properly registered
2. Check browser console for MSW-related errors
3. Ensure the MSW browser package is installed

### Mock Data Not Matching

If mock responses don't match your expectations:

1. Check the query parameters being sent
2. Verify the mock data structure matches your database schema
3. Add console.log statements in handlers for debugging

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
4. **Test your changes** in both browser and Node.js environments
5. **Run linting** with `pnpm run check --fix`

## License

MIT
