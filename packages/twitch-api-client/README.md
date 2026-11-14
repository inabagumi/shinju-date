# @shinju-date/twitch-api-client

Twitch Helix API client for the SHINJU DATE monorepo, powered by [twurple](https://twurple.js.org/).

## Features

- **App Access Token** auth via `@twurple/auth` (`AppTokenAuthProvider`)
- **Users / Videos / Clips / Streams** lookup for admin registration and batch ingestion
- **User video listing** with pagination helpers for batch discovery
- **Live stream helpers** (`toLiveTwitchVideoId` / `isLiveTwitchVideoId`) for placeholder platform IDs
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
  getTwitchApiClient,
} from '@shinju-date/twitch-api-client'

const identifier = parseTwitchUserIdentifier('https://www.twitch.tv/example')
const user = identifier ? await resolveTwitchUser(identifier) : null

for await (const stream of getStreamsByUserIds({ userIds: ['125328655'] })) {
  console.log(stream.title, stream.id)
}

// Low-level access when needed
const api = getTwitchApiClient()
```

### Lookups by ID

`getVideos` and `getClips` omit IDs that no longer exist. Helix answers a lookup by ID with `404` instead of an empty list when nothing matches, so a batch that fails with `404` is split and retried until only the missing IDs are left out. Other errors are rethrown.

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
