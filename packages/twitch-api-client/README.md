# @shinju-date/twitch-api-client

Twitch Helix API client for the SHINJU DATE monorepo, powered by [twurple](https://twurple.js.org/).

## Features

- **App Access Token** auth via `@twurple/auth` (`AppTokenAuthProvider`)
- **Users / Videos / Clips / Streams** lookup for admin registration and batch ingestion
- **User video listing** with pagination helpers for batch discovery
- **Identifier parsing** for login names, user IDs, and Twitch URLs
- Durations are mapped to ISO 8601 using twurple's `durationInSeconds` and `Temporal`

## Environment variables

```bash
TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
```

## Installation

This is a private workspace package. To use it in your app:

```json
{
  "dependencies": {
    "@shinju-date/twitch-api-client": "workspace:*"
  }
}
```

## Usage

```typescript
import {
  parseTwitchUserIdentifier,
  resolveTwitchUser,
  getUsers,
  getVideos,
  getVideosByUser,
  getStreamsByUserIds,
  getClips,
} from '@shinju-date/twitch-api-client'

const identifier = parseTwitchUserIdentifier('https://www.twitch.tv/example')
const user = identifier ? await resolveTwitchUser(identifier) : null

for await (const stream of getStreamsByUserIds({ userIds: ['125328655'] })) {
  console.log(stream.title, stream.id)
}
```

The helpers for the placeholder IDs of live streams (`toLiveTwitchVideoId` / `isLiveTwitchVideoId`) are in `@shinju-date/constants`, so browser code can use them without twurple.

### Passing a client

Every function that calls Helix takes an optional `client` (a twurple `ApiClient`). Without it, the shared client made from `TWITCH_CLIENT_ID` and `TWITCH_CLIENT_SECRET` is used. Tests pass their own:

```typescript
import type { ApiClient } from '@twurple/api'

const client = {
  videos: { getVideosByIds: async () => [] },
} as unknown as ApiClient

for await (const video of getVideos({ client, ids: ['1'] })) {
  // ...
}

const user = await resolveTwitchUser(identifier, { client })
```

### Lookups by ID

`getVideos` and `getClips` omit IDs that no longer exist. Helix answers a lookup by ID with `404` instead of an empty list when nothing matches, so a batch that fails with `404` is split and retried until only the missing IDs are left out. Other errors are rethrown.

`getUsers`, `getVideos`, `getClips` and `getStreamsByUserIds` accept any number of IDs and split them into batches of `TWITCH_API_MAX_RESULTS` (100). The batches are requested one after another. Pass `schedule` to run each request through it instead: every batch is requested at once, and `schedule` decides how many requests run at a time.

```typescript
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 5 })

for await (const video of getVideos({
  ids: videoIds,
  schedule: (request) => queue.add(request),
})) {
  // ...
}
```

### Listing a broadcaster's videos

```typescript
// First page only (newest first)
for await (const video of getVideosByUser({
  userId: '125328655',
  type: 'archive', // 'archive' | 'highlight' | 'upload' | 'all'
  limit: 20,
})) {
  console.log(video.id, video.stream_id)
}

// Every page
for await (const video of getVideosByUser({ userId: '125328655', all: true })) {
  // ...
}
```

Note that Twitch creates the archive of a broadcast as soon as it starts: an `archive` whose `stream_id` matches a stream returned by `getStreamsByUserIds` is still on air, and its `thumbnail_url` is empty until the broadcast ends.
