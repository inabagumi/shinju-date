# Next.js to Nitro Migration Guide

## Overview

The `apps/batch` application has been migrated from Next.js Route Handlers to Nitro for improved backend-focused development experience, multi-runtime support, and better deployment flexibility.

## What Changed

### Framework
- **Before**: Next.js 16 with Route Handlers
- **After**: Nitro 2.12 with Event Handlers

### Dependencies
- **Removed**:
  - `next`
  - `react`
  - `react-dom`
  - `@sentry/nextjs`
  - `@types/react`
  - `@types/react-dom`
  - `@tsconfig/next`
  - `babel-plugin-react-compiler`

- **Added**:
  - `nitropack`
  - `h3`
  - `@sentry/node`

### File Structure
```
Before:
apps/batch/
├── app/
│   ├── api/
│   │   ├── healthz/route.ts
│   │   └── readyz/route.ts
│   ├── stats/snapshot/route.ts
│   └── ...
└── next.config.ts

After:
apps/batch/
├── server/
│   ├── api/
│   │   ├── healthz.get.ts
│   │   └── readyz.get.ts
│   ├── routes/
│   │   ├── stats/snapshot.{get,post}.ts
│   │   └── ...
│   └── plugins/
│       └── sentry.ts
└── nitro.config.ts
```

### API Routes Mapping

| Next.js Route | Nitro Route | HTTP Methods |
|--------------|-------------|--------------|
| `/api/healthz/route.ts` | `/api/healthz.get.ts` | GET |
| `/api/readyz/route.ts` | `/api/readyz.get.ts` | GET |
| `/stats/snapshot/route.ts` | `/stats/snapshot.{get,post}.ts` | GET, POST |
| `/recommendation/queries/update/route.ts` | `/recommendation/queries/update.{get,post}.ts` | GET, POST |
| `/talents/update/route.ts` | `/talents/update.{get,post}.ts` | GET, POST |
| `/videos/update/route.ts` | `/videos/update.{get,post}.ts` | GET, POST |
| `/videos/check/route.ts` | `/videos/check.{get,post}.ts` | GET, POST |

### Code Changes

#### 1. Route Handler Format

**Before (Next.js)**:
```typescript
export async function POST(request: NextRequest): Promise<Response> {
  // ...
  return new Response(null, { status: 204 })
}
```

**After (Nitro)**:
```typescript
export default defineEventHandler(async (event) => {
  // ...
  setResponseStatus(event, 204)
  return null
})
```

#### 2. Error Handling

**Before (Next.js)**:
```typescript
return createErrorResponse('Unauthorized', { status: 401 })
```

**After (Nitro)**:
```typescript
throw createError({
  message: 'Unauthorized',
  statusCode: 401,
})
```

#### 3. Background Tasks

**Before (Next.js)**:
```typescript
import { after } from 'next/server'

after(async () => {
  await Sentry.flush(10_000)
})
```

**After (Nitro)**:
```typescript
import { afterResponse } from '@/lib/after-response'

afterResponse(event, async () => {
  await Sentry.flush(10_000)
})
```

#### 4. Request Parameters

**Before (Next.js)**:
```typescript
const { searchParams } = request.nextUrl
const all = searchParams.has('all')
```

**After (Nitro)**:
```typescript
const query = getQuery(event)
const all = query.all !== undefined
```

#### 5. Sentry Integration

**Before (Next.js)**:
```typescript
import * as Sentry from '@sentry/nextjs'
// Configured via next.config.ts
```

**After (Nitro)**:
```typescript
import * as Sentry from '@sentry/node'
// Configured via server/plugins/sentry.ts
```

## Environment Variables

No changes required. All environment variables remain the same:

- `NEXT_PUBLIC_SENTRY_DSN`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_URL`
- `GOOGLE_API_KEY`
- etc.

## Deployment (Vercel)

### No Configuration Changes Required

Nitro's Vercel preset automatically generates the correct build output for Vercel. The `vercel.json` cron configuration remains unchanged.

### Build Process

**Before**:
```bash
pnpm build  # Runs next build
```

**After**:
```bash
pnpm build  # Runs nitro build
```

Build output:
- **Before**: `.next/` directory
- **After**: `.output/` directory

### Vercel Configuration

The `vercel.json` cron jobs configuration remains exactly the same. Nitro's Vercel preset ensures compatibility.

## Development

### Starting Dev Server

```bash
cd apps/batch
pnpm dev  # Starts Nitro dev server on port 5000
```

### Testing

All tests remain compatible:
```bash
pnpm test  # Runs vitest
```

### Building

```bash
pnpm build  # Builds for Vercel
```

## Known Limitations & Workarounds

### 1. Workspace Package Bundling

**Issue**: Nitro may have trouble bundling workspace packages with pre-built dist files.

**Solution**: Use source file aliasing in `nitro.config.ts`:
```typescript
alias: {
  '@shinju-date/youtube-api-client': fileURLToPath(
    new URL('../../packages/youtube-api-client/src/index.ts', import.meta.url)
  ),
}
```

### 2. Request Signal

**Issue**: Nitro's H3 events don't have a `signal` property like Next.js requests.

**Solution**: Omit the signal parameter when calling functions that accept it:
```typescript
// Before
await revalidateTags(['videos'], { signal: request.signal })

// After
await revalidateTags(['videos'])
```

## Benefits

### 1. **Better Backend Focus**
Nitro is designed specifically for backend APIs without the overhead of React/Next.js frontend concerns.

### 2. **Multi-Runtime Support**
Easy migration to other platforms (Cloudflare Workers, AWS Lambda, etc.) in the future.

### 3. **Smaller Bundle Size**
No React dependencies means smaller deployment bundles.

### 4. **Faster Cold Starts**
Optimized for serverless environments with better cold start performance.

### 5. **Simplified Configuration**
Single `nitro.config.ts` file instead of complex Next.js configuration.

## Troubleshooting

### Build Fails with Module Resolution Errors

**Problem**: Cannot find workspace packages during build.

**Solution**: Check `nitro.config.ts` alias configuration and ensure source files are referenced correctly.

### Sentry Not Initializing

**Problem**: Sentry errors are not being captured.

**Solution**: Verify `NEXT_PUBLIC_SENTRY_DSN` environment variable is set and the Sentry plugin is loading correctly in `server/plugins/sentry.ts`.

### Cron Jobs Not Triggering

**Problem**: Vercel Cron jobs not calling endpoints.

**Solution**: Verify `vercel.json` paths match the new Nitro route structure (they should be the same).

## Rollback Plan

If issues arise, the migration can be reverted by:

1. Reverting this commit
2. Running `pnpm install` to restore previous dependencies
3. Redeploying to Vercel

The old Next.js implementation is preserved in the git history.

## Support

For issues or questions regarding this migration:
1. Check this guide first
2. Review the Nitro documentation: https://nitro.unjs.io
3. Open an issue in the repository
