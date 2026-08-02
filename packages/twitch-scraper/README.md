# @shinju-date/twitch-scraper

Twitch Helix scraper for SHINJU DATE batch jobs. Mirrors `@shinju-date/youtube-scraper` with callback-based orchestration over `@shinju-date/twitch-api-client`.

## Features

- **Users** — `scrapeUsers` for display name / login refresh
- **New VODs** — `scrapeNewVideos` per broadcaster (first page of archives by default)
- **Videos / clips by ID** — `scrapeVideos`, `scrapeClips` for metadata refresh
- **Availability** — `scrapeVideosAvailability` for soft-delete checks
- **Concurrency** — internal `p-queue` for multi-user discovery
- **Injectable client** — pass a `TwitchScraperClient` for tests

## Usage

```typescript
import { TwitchScraper } from '@shinju-date/twitch-scraper'

await using scraper = new TwitchScraper({ concurrency: 2 })

await scraper.scrapeNewVideos(
  { userIds: ['12345'], type: 'archive' },
  async (userId, videos) => {
    // persist videos for this broadcaster
  },
)
```

## Environment

Requires the same credentials as `@shinju-date/twitch-api-client`:

```bash
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
```
