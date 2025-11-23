# @shinju-date/composable-fetch

**Composable fetch middleware** for HTTP caching, retries, and extensibility in TypeScript/JavaScript applications.

## Overview

`@shinju-date/composable-fetch` provides a flexible, middleware-based architecture for extending the native `fetch` API. It enables ETag-based HTTP caching, automatic retries, and custom middleware composition with full TypeScript support and dependency injection.

### Key Features

- **🔄 ETag-Based Caching**: Automatic HTTP caching with `If-None-Match` headers for efficient API usage
- **♻️ Automatic Retries**: Configurable retry logic with exponential backoff for failed requests
- **🧩 Composable Middleware**: Easy-to-use middleware composition pattern for extending fetch behavior
- **💉 Dependency Injection**: Redis-backed cache storage with pluggable storage backends
- **📦 Type-Safe**: Full TypeScript support with comprehensive type definitions
- **🧪 Well-Tested**: Extensive test coverage for all features

## Installation

```bash
pnpm add @shinju-date/composable-fetch
```

## Quick Start

### Basic Usage with Retry

```typescript
import { composeFetch, withRetry } from '@shinju-date/composable-fetch'

// Create a fetch function with retry middleware
const retryFetch = composeFetch(
  withRetry(fetch, { retries: 3 })
)

// Use like native fetch
const response = await retryFetch('https://api.example.com/data')
const data = await response.json()
```

### ETag Caching with Redis

```typescript
import { composeFetch, withCache, RedisCacheStorage } from '@shinju-date/composable-fetch'
import { Redis } from '@upstash/redis'

// Set up Redis-backed cache storage
const redis = Redis.fromEnv()
const storage = new RedisCacheStorage({
  redis,
  ttl: 3600, // 1 hour default TTL
  keyPrefix: 'api:cache:',
})

// Create a fetch function with caching
const cachedFetch = composeFetch(
  withCache(fetch, { storage })
)

// First request: fetches from API and caches with ETag
const response1 = await cachedFetch('https://api.example.com/data')

// Second request: sends If-None-Match header
// Returns cached data on 304 Not Modified
const response2 = await cachedFetch('https://api.example.com/data')
```

### Combining Multiple Middlewares

```typescript
import { 
  composeFetch, 
  withRetry, 
  withCache, 
  InMemoryCacheStorage 
} from '@shinju-date/composable-fetch'

// Compose multiple middlewares
// Order matters: retry is outermost, cache is innermost
const enhancedFetch = composeFetch(
  withRetry(fetch, { retries: 3, abortOn404: true }),
  withCache(fetch, { 
    storage: new InMemoryCacheStorage({ ttl: 300 }),
    useETag: true 
  })
)

const response = await enhancedFetch('https://api.example.com/data')
```

## Architecture

### Middleware Pattern

The package uses a composable middleware pattern where each middleware wraps the `fetch` function and can:

1. Modify the request before it's sent
2. Modify the response after it's received
3. Add cross-cutting concerns (caching, retries, logging, etc.)

```typescript
type FetchMiddleware<TOptions = MiddlewareOptions> = (
  next: FetchFunction,
  options?: TOptions,
) => FetchFunction
```

### Middleware Composition

Middlewares are composed from left to right, with the leftmost middleware being the outermost:

```typescript
// Execution order:
// 1. withRetry processes the request first
// 2. withCache processes the request second
// 3. Actual fetch happens
// 4. withCache processes the response first
// 5. withRetry processes the response last
const fetch = composeFetch(
  withRetry,
  withCache
)
```

## API Reference

### Core Functions

#### `composeFetch(...middlewares)`

Composes multiple fetch middlewares into a single fetch function.

**Parameters:**
- `middlewares`: Array of `FetchMiddleware` functions to compose

**Returns:**
- A composed `FetchFunction` with all middlewares applied

**Example:**
```typescript
const enhancedFetch = composeFetch(
  withRetry(fetch, { retries: 3 }),
  withCache(fetch, { storage })
)
```

### Middlewares

#### `withCache(next, options)`

Middleware that implements ETag-based HTTP caching.

**Options:**
- `storage: CacheStorage` (required): Cache storage backend (Redis, in-memory, etc.)
- `ttl?: number`: Default TTL in seconds for cached entries
- `useETag?: boolean`: Whether to use If-None-Match headers (default: `true`)

**Features:**
- Stores responses with `ETag` headers in cache storage
- Sends `If-None-Match` headers on subsequent requests
- Returns cached response on `304 Not Modified`
- Supports custom TTL per request via `X-Cache-TTL` header
- Only caches `GET` requests by default

**Example:**
```typescript
const cachedFetch = withCache(fetch, {
  storage: new RedisCacheStorage({ redis }),
  ttl: 3600,
  useETag: true,
})

// Custom TTL for specific request
const response = await cachedFetch('https://api.example.com/data', {
  headers: { 'X-Cache-TTL': '7200' } // 2 hours
})
```

#### `withRetry(next, options)`

Middleware that adds automatic retry logic to fetch requests.

**Options:**
- `retries?: number`: Maximum number of retry attempts (default: `5`)
- `abortOn404?: boolean`: Whether to abort retry on 404 responses (default: `true`)

**Features:**
- Retries failed requests up to a configurable number of times
- Uses exponential backoff via `p-retry`
- Aborts retry on 404 responses by default
- Does not retry on 304 Not Modified responses
- Consumes response body on error to reuse socket (Node.js optimization)

**Example:**
```typescript
const retryFetch = withRetry(fetch, {
  retries: 3,
  abortOn404: false, // Retry on 404
})

const response = await retryFetch('https://api.example.com/data')
```

### Cache Storage

#### `CacheStorage` Interface

Abstract interface for cache storage implementations.

```typescript
interface CacheStorage {
  get(key: string): Promise<CachedResponse | null>
  set(key: string, value: CachedResponse, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
}
```

#### `RedisCacheStorage`

Redis-based implementation of `CacheStorage`.

**Options:**
- `redis: RedisLike` (required): Redis client instance
- `keyPrefix?: string`: Key prefix for all cache entries (default: `"etag:cache:"`)
- `ttl?: number`: Default TTL in seconds (default: `3600`)

**Example:**
```typescript
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const storage = new RedisCacheStorage({
  redis,
  keyPrefix: 'api:',
  ttl: 7200, // 2 hours
})
```

**Compatible Redis Clients:**
- `@upstash/redis`
- `ioredis`
- Any client implementing the `RedisLike` interface

#### `InMemoryCacheStorage`

In-memory implementation of `CacheStorage` for development and testing.

**Options:**
- `ttl?: number`: Default TTL in seconds (default: `3600`)

**Example:**
```typescript
const storage = new InMemoryCacheStorage({ ttl: 300 })

// Useful testing methods
storage.size() // Get number of cached entries
storage.clear() // Clear all entries
```

**Note:** In-memory cache is not shared across processes and is lost on restart.

### Utility Functions

#### `generateCacheKey(request)`

Generates a cache key from a Request object or URL string.

**Parameters:**
- `request: Request | string`: The fetch request or URL

**Returns:**
- `string`: A unique cache key in the format `METHOD:URL`

**Example:**
```typescript
import { generateCacheKey } from '@shinju-date/composable-fetch'

const key = generateCacheKey('https://api.example.com/data')
// Returns: "GET:https://api.example.com/data"

const request = new Request('https://api.example.com/data', { method: 'POST' })
const postKey = generateCacheKey(request)
// Returns: "POST:https://api.example.com/data"
```

## ETag Strategy & Benefits

### What is ETag?

An **ETag** (Entity Tag) is an HTTP response header that represents a specific version of a resource. When the resource changes, the ETag value changes, allowing efficient cache validation without re-downloading the entire response.

### How It Works

1. **First Request**: Client requests a resource
   ```
   GET /api/data HTTP/1.1
   ```
   Server responds with:
   ```
   HTTP/1.1 200 OK
   ETag: "abc123"
   Content-Length: 1234
   
   { "data": "..." }
   ```

2. **Subsequent Request**: Client includes the ETag in `If-None-Match`
   ```
   GET /api/data HTTP/1.1
   If-None-Match: "abc123"
   ```
   
   - If unchanged: Server responds with `304 Not Modified` (no body)
   - If changed: Server responds with `200 OK` and new data

### Benefits

✅ **Reduced Bandwidth**: 304 responses have no body, saving bandwidth  
✅ **Lower API Quota Usage**: Many APIs count 304 responses at reduced rates  
✅ **Faster Response Times**: Cached data is returned immediately on 304  
✅ **Guaranteed Freshness**: Always validates with the server  
✅ **Automatic Invalidation**: Server decides when data is stale  

### Best Use Cases

- **YouTube Data API**: Reduces quota consumption significantly
- **GitHub API**: Conditional requests count at reduced rate limits
- **Any API with ETag support**: Automatic optimization

### Comparison with Time-Based Caching

| Feature | ETag-Based | Time-Based (TTL) |
|---------|-----------|------------------|
| Validation | Always current | May serve stale data |
| Bandwidth | Minimal (304s) | Full response every time |
| API Quota | Reduced | Full quota usage |
| Implementation | Automatic | Requires TTL tuning |
| Freshness | Guaranteed | Best-effort |

## Advanced Usage

### Custom Middleware

Create your own middleware by following the `FetchMiddleware` pattern:

```typescript
import type { FetchMiddleware } from '@shinju-date/composable-fetch'

type LoggingOptions = {
  verbose?: boolean
}

const withLogging: FetchMiddleware<LoggingOptions> = (next, options = {}) => {
  return async (input, init) => {
    const start = Date.now()
    const url = typeof input === 'string' ? input : input.url
    
    console.log(`[Fetch] ${init?.method || 'GET'} ${url}`)
    
    const response = await next(input, init)
    
    const duration = Date.now() - start
    console.log(`[Fetch] ${response.status} in ${duration}ms`)
    
    if (options.verbose) {
      console.log(`[Fetch] Headers:`, response.headers)
    }
    
    return response
  }
}

// Use with other middlewares
const fetch = composeFetch(
  withLogging(fetch, { verbose: true }),
  withRetry(fetch),
  withCache(fetch, { storage })
)
```

### Per-Request Cache TTL

Control cache TTL on a per-request basis:

```typescript
const cachedFetch = composeFetch(
  withCache(fetch, { 
    storage,
    ttl: 3600 // Default 1 hour
  })
)

// Override TTL for this specific request
const response = await cachedFetch('https://api.example.com/data', {
  headers: {
    'X-Cache-TTL': '7200' // Cache for 2 hours instead
  }
})
```

### Manual Cache Management

Access the cache storage directly for manual control:

```typescript
import { generateCacheKey } from '@shinju-date/composable-fetch'

const storage = new RedisCacheStorage({ redis })

// Get cached response
const cached = await storage.get('GET:https://api.example.com/data')

// Delete specific cache entry
await storage.delete('GET:https://api.example.com/data')

// Store custom response
await storage.set(
  generateCacheKey('https://api.example.com/data'),
  {
    body: '{"data":"custom"}',
    etag: '"custom123"',
    headers: { 'content-type': 'application/json' },
    status: 200,
    statusText: 'OK',
  },
  3600
)
```

## Testing

The package includes comprehensive tests covering all functionality:

```bash
# Run tests
pnpm test

# Watch mode
pnpm dev
```

### Testing with In-Memory Cache

Use `InMemoryCacheStorage` for testing without Redis:

```typescript
import { InMemoryCacheStorage } from '@shinju-date/composable-fetch'

describe('My API tests', () => {
  let storage: InMemoryCacheStorage
  
  beforeEach(() => {
    storage = new InMemoryCacheStorage()
  })
  
  afterEach(() => {
    storage.clear() // Clean up between tests
  })
  
  it('should cache responses', async () => {
    const fetch = composeFetch(
      withCache(fetch, { storage })
    )
    
    // ... test implementation
    
    expect(storage.size()).toBe(1) // Verify cache entry
  })
})
```

## Design Decisions

### Why Middleware Pattern?

1. **Separation of Concerns**: Each middleware handles one responsibility
2. **Composability**: Mix and match features as needed
3. **Extensibility**: Easy to add custom middleware
4. **Testability**: Each middleware can be tested independently
5. **Type Safety**: Full TypeScript support with proper type inference

### Why Dependency Injection for Cache Storage?

1. **Flexibility**: Use Redis, in-memory, or custom storage backends
2. **Testing**: Easy to mock storage in tests
3. **No Lock-In**: Not tied to specific Redis client or storage provider
4. **Scalability**: Can switch storage strategy based on environment

### Why Not Just Use HTTP Cache-Control?

`Cache-Control` headers are great but have limitations:

- **Browser-Only**: Many HTTP clients don't implement HTTP caching
- **No Programmatic Control**: Can't easily invalidate or inspect cache
- **Complex Rules**: Cache-Control directives can be complex to configure
- **ETag Synergy**: Our approach works alongside Cache-Control for best results

This package gives you **full programmatic control** over caching with **ETag validation**, complementing browser-based HTTP caching.

## Migration from `@shinju-date/retryable-fetch`

If you're currently using `@shinju-date/retryable-fetch`, migration is straightforward:

### Before

```typescript
import retryableFetch from '@shinju-date/retryable-fetch'

const response = await retryableFetch('https://api.example.com/data')
```

### After

```typescript
import { composeFetch, withRetry } from '@shinju-date/composable-fetch'

// Create once, reuse everywhere
const retryFetch = composeFetch(
  withRetry(fetch, { retries: 5 })
)

const response = await retryFetch('https://api.example.com/data')
```

The new version offers the same retry functionality plus:
- Configurable retry behavior
- Composability with other middlewares
- Better type safety
- More comprehensive error handling

## Performance Considerations

### Cache Key Generation

Cache keys are generated using `METHOD:URL` format. For optimal performance:

- Use consistent URL formatting
- Avoid unnecessary query parameter variations
- Consider normalizing URLs before caching

### Redis Connection Pooling

When using Redis:

```typescript
import { Redis } from '@upstash/redis'

// Create Redis client once and reuse
const redis = Redis.fromEnv({
  cache: 'default', // Enable HTTP caching in Upstash client
})

const storage = new RedisCacheStorage({ redis })
```

### Memory Usage

For `InMemoryCacheStorage`:

- Expired entries are removed on access
- Consider implementing periodic cleanup for long-running processes
- Monitor cache size in production

## Troubleshooting

### ETag Not Being Used

Check that:
1. The API returns `ETag` headers in responses
2. `useETag: true` in cache middleware options (default)
3. Requests are `GET` (other methods not cached by default)

### Cache Not Persisting

For Redis:
1. Verify Redis connection is working
2. Check Redis TTL is set appropriately
3. Ensure Redis has enough memory

For In-Memory:
1. Remember cache is process-local
2. Cache is lost on application restart

### 304 Responses Not Working

1. Verify API supports conditional requests with `If-None-Match`
2. Check that `ETag` format is correct (including quotes if needed)
3. Ensure middleware order is correct (retry before cache)

## Contributing

Contributions are welcome! Please follow the project's coding standards and include tests for new features.

## License

MIT

## Related Packages

- `@shinju-date/retryable-fetch`: Legacy retry-only implementation
- `@upstash/redis`: Serverless Redis client
- `p-retry`: Retry library used internally

## Credits

Developed by **Haneru Developers** for the SHINJU DATE project.
