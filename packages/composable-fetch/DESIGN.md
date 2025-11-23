# Composable Fetch Design Document

## Overview

This document describes the design, architecture, and implementation decisions for the `@shinju-date/composable-fetch` package.

## Problem Statement

The SHINJU DATE project needs efficient API caching to:
- Reduce bandwidth consumption for API responses
- Lower API quota usage (especially for YouTube Data API)
- Improve response times through caching
- Maintain data freshness with validation

Traditional time-based (TTL) caching has limitations:
- May serve stale data within TTL window
- Cannot validate freshness without full re-fetch
- Wastes bandwidth on unchanged data

## Solution: ETag-Based HTTP Caching

### ETag Mechanics

ETags (Entity Tags) are HTTP response headers representing resource versions:

```
HTTP/1.1 200 OK
ETag: "abc123"
Content-Length: 1234

{ "data": "..." }
```

On subsequent requests, clients send `If-None-Match` with the cached ETag:

```
GET /api/data HTTP/1.1
If-None-Match: "abc123"
```

Server responses:
- **304 Not Modified**: Resource unchanged (no body, minimal bandwidth)
- **200 OK**: Resource changed (new data, new ETag)

### Benefits Over Time-Based Caching

| Aspect | ETag-Based | Time-Based (TTL) |
|--------|-----------|------------------|
| Data Freshness | Guaranteed | Best-effort |
| Bandwidth | Minimal on 304 | Full response |
| API Quota | Reduced rate | Full rate |
| Staleness | None | Possible within TTL |
| Implementation | Automatic | Requires TTL tuning |

## Architecture

### Middleware Pattern

The package uses a composable middleware pattern inspired by Express.js and Redux middleware:

```typescript
type FetchMiddleware<TOptions = MiddlewareOptions> = (
  next: FetchFunction,
  options?: TOptions
) => FetchFunction
```

Each middleware:
1. Receives the next fetch function in the chain
2. Returns a wrapped fetch function
3. Can modify request before calling next
4. Can modify response after next returns

### Composition

Middlewares compose right-to-left (innermost to outermost):

```typescript
const fetch = composeFetch(
  middlewareA,  // Outermost - processes first/last
  middlewareB,  // Middle
  middlewareC   // Innermost - processes last/first
)
```

Execution flow:
```
Request:  A → B → C → actual fetch
Response: A ← B ← C ← actual fetch
```

This allows:
- Retry logic in outer layer (can retry cache + fetch)
- Cache in inner layer (cache actual fetch results)
- Custom middleware anywhere in the chain

## Components

### 1. Core Types (`types.ts`)

**`FetchMiddleware<TOptions>`**: Middleware function type
- Generic over options for type-safe configuration
- Receives next fetch and options
- Returns wrapped fetch

**`composeFetch(...middlewares)`**: Composition utility
- Reduces middleware array right-to-left
- Returns composed fetch function

### 2. Cache Storage Interface (`cache-storage.ts`)

**`CacheStorage`**: Abstract interface for storage backends
- `get(key)`: Retrieve cached response
- `set(key, value, ttl?)`: Store response with optional TTL
- `delete(key)`: Remove cached entry

**`CachedResponse`**: Serializable response format
- `body`: Response body as string
- `etag`: ETag value
- `headers`: Serialized headers
- `status`, `statusText`: HTTP status

**`generateCacheKey(request)`**: Cache key generation
- Format: `METHOD:URL`
- Ensures unique keys per request

### 3. Storage Implementations

#### Redis Storage (`redis-cache-storage.ts`)

**`RedisLike`**: Minimal Redis interface
- Compatible with Upstash Redis, ioredis, etc.
- Only requires: `get`, `set`, `del`

**`RedisCacheStorage`**: Redis-backed implementation
- Dependency injection for Redis client
- Configurable key prefix
- Default TTL support
- JSON serialization/deserialization

#### In-Memory Storage (`in-memory-cache-storage.ts`)

**`InMemoryCacheStorage`**: Map-based implementation
- For testing and development
- Automatic expiration checking
- Size tracking and clearing

### 4. Cache Middleware (`with-cache.ts`)

**`withCache(next, options)`**: ETag caching middleware

Flow:
1. Check cache for existing response
2. If cached, send `If-None-Match` request
3. On 304: Return cached response
4. On 200: Cache new response, return
5. If no cache: Fetch and cache if ETag present

Features:
- Only caches GET requests
- Respects `X-Cache-TTL` header for per-request TTL
- Configurable `useETag` flag
- Header serialization/deserialization

### 5. Retry Middleware (`with-retry.ts`)

**`withRetry(next, options)`**: Exponential backoff retry

Flow:
1. Attempt fetch
2. On error and not ok:
   - Consume body (socket reuse)
   - Abort on 404 if configured
   - Retry with exponential backoff
3. Return response on success

Features:
- Uses `p-retry` for backoff logic
- Configurable retry count
- 404 abort option
- Does not retry 304 responses

## Usage Patterns

### Basic Retry

```typescript
const fetch = composeFetch(
  (next) => withRetry(next, { retries: 3 })
)
```

### Basic Cache

```typescript
const storage = new RedisCacheStorage({ redis })
const fetch = composeFetch(
  (next) => withCache(next, { storage })
)
```

### Combined (Recommended)

```typescript
const fetch = composeFetch(
  (next) => withRetry(next, { retries: 3 }),
  (next) => withCache(next, { storage })
)
```

Order matters:
- Retry outermost: Retries both cache lookup and fetch
- Cache innermost: Caches successful fetch results

## Design Decisions

### Why Middleware Pattern?

**Alternatives considered:**
1. Class-based with inheritance
2. Function composition with currying
3. Configuration object approach

**Middleware chosen because:**
- Familiar pattern (Express, Redux)
- Easy to understand and extend
- Natural composition
- Type-safe with TypeScript
- Testable in isolation

### Why Dependency Injection for Redis?

**Alternatives considered:**
1. Direct Redis client instantiation
2. Singleton pattern
3. Factory pattern

**DI chosen because:**
- Testable with mocks
- No lock-in to specific Redis client
- Flexible (Upstash, ioredis, etc.)
- Explicit dependencies
- Environment-agnostic

### Why Separate Storage Interface?

**Benefits:**
- Pluggable backends (Redis, memory, filesystem, etc.)
- Easy testing with InMemoryStorage
- Clear contracts
- Future-proof for other storage types

### Why String Body in CachedResponse?

**Alternatives considered:**
1. ArrayBuffer
2. Blob
3. ReadableStream

**String chosen because:**
- Serializable to JSON for Redis
- Simple to work with
- Most API responses are text (JSON, HTML, etc.)
- Easy to reconstruct Response object

**Trade-offs:**
- Binary data needs base64 encoding
- Memory usage for large responses
- Acceptable for typical API responses

### Why X-Cache-TTL Header?

**Alternatives considered:**
1. Query parameter
2. Separate options object per request
3. URL-based configuration

**Header chosen because:**
- Standard HTTP extension pattern
- Doesn't modify URL
- Request-specific without API changes
- Can be set by upstream systems

## Testing Strategy

### Unit Tests

**Coverage areas:**
1. Middleware composition
2. Cache storage implementations
3. Cache middleware behavior
4. Retry middleware behavior
5. Edge cases (expired cache, no ETag, etc.)

**Test patterns:**
- Mock fetch functions
- InMemoryStorage for cache tests
- Mock Redis for Redis tests
- Time-based tests for TTL

### Integration Points

Tests verify:
- Middleware composition works correctly
- Storage implementations are interchangeable
- ETag flow matches HTTP spec
- Retry logic follows exponential backoff

## Performance Considerations

### Cache Key Generation

Simple string concatenation is fast:
```typescript
`${method}:${url}`
```

For high-throughput systems, consider:
- Key normalization (query param order)
- URL canonicalization
- Hash-based keys for very long URLs

### Redis Performance

- Connection pooling (handled by client)
- Pipeline operations for bulk cache
- TTL reduces Redis memory pressure

### Memory Usage

InMemoryStorage:
- Use only for development/testing
- Not shared across processes
- Consider periodic cleanup for long-running processes

## Future Enhancements

### Potential Features

1. **Vary Header Support**: Cache based on request headers
2. **Cache-Control Integration**: Respect HTTP cache headers
3. **Stale-While-Revalidate**: Serve stale data while fetching fresh
4. **Cache Warming**: Pre-populate cache
5. **Batch Operations**: Bulk cache set/get
6. **Statistics/Metrics**: Cache hit rates, etc.
7. **Compression**: Gzip cached responses

### Backward Compatibility

When adding features:
- Maintain existing middleware interface
- Add new optional parameters
- Provide sensible defaults
- Document migration paths

## Migration from retryable-fetch

The old `@shinju-date/retryable-fetch` provided basic retry:

```typescript
import retryableFetch from '@shinju-date/retryable-fetch'
const response = await retryableFetch(url)
```

New approach with `composeFetch`:

```typescript
import { composeFetch, withRetry } from '@shinju-date/composable-fetch'
const fetch = composeFetch((next) => withRetry(next))
const response = await fetch(url)
```

**Benefits:**
- Composable with other middleware
- Configurable options
- Better type safety
- Extensible for future needs

**Migration strategy:**
- Keep old package for backward compatibility
- Update examples to use new package
- Document migration path
- Deprecate old package in future release

## References

- [HTTP ETag Specification (RFC 7232)](https://www.rfc-editor.org/rfc/rfc7232)
- [HTTP Conditional Requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests)
- [p-retry Library](https://github.com/sindresorhus/p-retry)
- [Upstash Redis](https://upstash.com/docs/redis)
