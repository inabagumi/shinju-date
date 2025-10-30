# @shinju-date/msw-handlers

Common mock server handlers using MSW (Mock Service Worker) for the SHINJU DATE monorepo.

This package provides a unified mock infrastructure that enables efficient development across multiple applications (`web`, `admin`, `batch`) and improves GitHub Copilot code completion accuracy by providing consistent API responses.

## Features

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

### Browser Environment (Next.js Apps)

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
    id: 1,
    title: 'Sample Video 1',
    duration: 'PT10M30S',
    channel_id: 1,
    thumbnail_id: 1,
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

## Adding New Mock Data

### Extending Supabase Mocks

To add more tables or modify existing data:

1. **Edit `src/handlers/supabase.ts`**:

```typescript
// Add new mock data
const mockNewTable = [
  {
    id: 1,
    name: 'Example',
    // ... more fields
  }
]

// Add new handler
http.get('*/rest/v1/new_table', ({ request }) => {
  const url = new URL(request.url)
  const query = parseSupabaseQuery(url)

  let filteredData = applySupabaseFilters(mockNewTable, query)
  filteredData = applySelect(filteredData, query.select)

  return HttpResponse.json(filteredData)
})
```

### Extending Redis Mocks

To add new Redis commands or data:

1. **Edit `src/handlers/upstash.ts`**:

```typescript
// Add data in initializeRedisData()
mockRedisStore.set('my:new:key', 'value')

// Add command handler
case 'mynewcommand': {
  const [key, value] = args
  // Implementation
  results.push({ result: 'OK' })
  break
}
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
