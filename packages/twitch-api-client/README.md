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
