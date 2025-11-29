# MSW Build Guide

This guide explains how to build Next.js applications with Mock Service Worker (MSW) enabled for development and testing.

## Overview

MSW (Mock Service Worker) allows you to mock API requests during development and build time. This is particularly useful for:
- Building applications without requiring live backend services
- Running E2E tests with predictable mock data
- Developing features independently from backend availability

## Quick Start

### Option 1: Using withMSW Helper (Recommended)

The simplest approach - modify your `next.config.ts`:

```typescript
import { withMSW } from '@shinju-date/msw-handlers/next-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // your config
}

export default withMSW(nextConfig)
```

Then just set the environment variable:

```bash
ENABLE_MSW=true pnpm run build
```

### Option 2: Using NODE_OPTIONS

If you prefer not to modify `next.config.ts` or need more control:

```bash
NODE_OPTIONS="--import @shinju-date/msw-handlers/register" ENABLE_MSW=true pnpm run build
```

## Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Enable MSW
ENABLE_MSW=true

# Supabase (fake values for MSW)
NEXT_PUBLIC_SUPABASE_ANON_KEY="fake"
NEXT_PUBLIC_SUPABASE_URL="https://fake.supabase.test"

# For admin app only - service role key
SUPABASE_SERVICE_ROLE_KEY="fake"

# Upstash Redis (fake values for MSW)
UPSTASH_REDIS_REST_TOKEN="fake"
UPSTASH_REDIS_REST_URL="https://fake.upstash.test"
```

### Using withMSW in next.config.ts (Recommended)

The `withMSW` helper automatically sets up MSW for your Next.js app:

**Step 1: Update next.config.ts**

```typescript
import { withMSW } from '@shinju-date/msw-handlers/next-config'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // your existing config
}

// Wrap your config with withMSW
export default withMSW(nextConfig)

// Or with other wrappers (order matters):
// export default withMSW(withSentry(nextConfig))
```

**Step 2: Set environment variable**

```env
# In .env.local
ENABLE_MSW=true
```

**Step 3: Build or run dev**

```bash
pnpm run build  # or pnpm run dev
```

That's it! The `withMSW` helper takes care of setting up `NODE_OPTIONS` automatically.

### Using NODE_OPTIONS (Alternative)

You can update your `package.json` scripts to include MSW support:

```json
{
  "scripts": {
    "build": "next build",
    "build:msw": "NODE_OPTIONS='--import @shinju-date/msw-handlers/register' ENABLE_MSW=true next build",
    "dev": "next dev",
    "dev:msw": "NODE_OPTIONS='--import @shinju-date/msw-handlers/register' ENABLE_MSW=true next dev"
  }
}
```

## How It Works

### The Problem

Next.js uses worker threads for parallel page generation during build. MSW needs to be initialized in each worker thread to intercept network requests. The standard `instrumentation.ts` file doesn't run during static page generation.

### The Solution

The `@shinju-date/msw-handlers/register` module uses Node.js's `--import` flag to load MSW before any application code:

1. Node.js loads the register module first (via `--import`)
2. The register module starts the MSW server
3. MSW intercepts all subsequent network requests
4. Next.js build proceeds with mocked APIs

This ensures MSW is ready before any code tries to make API calls.

## Mock Data

The MSW handlers provide mock data for:

### Supabase Tables
- `videos` - Video content with metadata
- `channels` - Channel information
- `thumbnails` - Thumbnail images
- `talents` - Talent/creator information
- `terms` - Search terms
- `youtube_videos` - YouTube video mappings
- `youtube_channels` - YouTube channel mappings

### Redis Operations
- Click tracking (`videos:clicked:*`, `channels:clicked:*`)
- Search analytics (`search:popular:*`, `search:volume:*`)
- Summary statistics (`summary:stats:*`)
- Recommendation queries (`queries:*`)

### Storage
- Thumbnail image serving
- Signed URL generation

## Build Output

With MSW enabled, you'll see:

```
🎯 MSW Redis mock data initialized with dates: [...]
🚀 MSW server started
✅ MSW server registered via --import flag
```

These messages confirm MSW is running properly.

## Troubleshooting

### Build Fails with DNS Errors

If you see errors like `getaddrinfo ENOTFOUND fake.upstash.test`:
- Ensure `NODE_OPTIONS` environment variable is set correctly
- Verify `ENABLE_MSW=true` is set
- Check that `@shinju-date/msw-handlers` package is built

### MSW Not Starting

If you don't see MSW startup messages:
- Verify Node.js version is 18+ (required for `--import` and top-level await)
- Check that the register module path is correct
- Ensure the MSW handlers package is properly built: `cd packages/msw-handlers && pnpm run build`

### Port Already in Use (Development)

If you get `EADDRINUSE` errors:
```bash
# Kill existing dev servers
pkill -f "next --port"
# Then restart
pnpm run dev:msw
```

## Known Limitations

### Nested Fetch at Runtime

The `/images/thumbnails/[id]` route has a known limitation where MSW doesn't intercept nested fetch calls (a fetch call made from within another fetch handler). This only affects runtime behavior, not builds, as the route is dynamic.

**Impact**: Thumbnail images may not load correctly in development mode with MSW
**Workaround**: Disable MSW for development if you need to test thumbnail images, or mock the images differently

### Dynamic Routes

Dynamic routes (marked with `ƒ` in build output) are not prerendered and don't require MSW during build. They're server-rendered at request time.

## Best Practices

1. **Use MSW for CI/CD**: Enable MSW in CI builds to avoid dependency on live services
2. **Separate Configs**: Use different `.env` files for MSW vs production builds
3. **Test with Real APIs**: Periodically test against real APIs to catch integration issues
4. **Keep Mocks Updated**: Update MSW handlers when API schemas change

## Examples

### GitHub Actions CI

```yaml
- name: Build with MSW
  env:
    NODE_OPTIONS: "--import @shinju-date/msw-handlers/register"
    ENABLE_MSW: "true"
    NEXT_PUBLIC_SUPABASE_URL: "https://fake.supabase.test"
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "fake"
    UPSTASH_REDIS_REST_URL: "https://fake.upstash.test"
    UPSTASH_REDIS_REST_TOKEN: "fake"
  run: pnpm run build
```

### Local Development

```bash
# Option 1: Environment variables
export NODE_OPTIONS="--import @shinju-date/msw-handlers/register"
export ENABLE_MSW=true
pnpm run dev

# Option 2: Inline
NODE_OPTIONS="--import @shinju-date/msw-handlers/register" ENABLE_MSW=true pnpm run dev

# Option 3: npm script (recommended)
pnpm run dev:msw
```

## Additional Resources

- [MSW Documentation](https://mswjs.io/)
- [Next.js Instrumentation](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [Node.js --import Flag](https://nodejs.org/api/cli.html#--importmodule)
- [MSW Handlers Package README](../packages/msw-handlers/README.md)

## Support

If you encounter issues not covered in this guide:
1. Check the MSW handlers test suite for working examples
2. Review the `packages/msw-handlers/src/handlers/` files for handler implementations
3. Open an issue with detailed error messages and reproduction steps
