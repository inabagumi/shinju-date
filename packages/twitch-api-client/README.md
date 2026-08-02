# @shinju-date/twitch-api-client

Twitch Helix API client for the SHINJU DATE monorepo, powered by [twurple](https://twurple.js.org/).

## Features

- **App Access Token** auth via `@twurple/auth` (`AppTokenAuthProvider`)
- **Users / Videos / Clips** lookup for admin registration and manual sync
- **User video listing** with pagination helpers for future batch ingestion
- **Identifier parsing** for login names, user IDs, and Twitch URLs
- **Duration helpers** to convert Twitch duration strings to ISO 8601

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
  getClips,
  twitchDurationToISO8601,
  getTwitchApiClient,
} from '@shinju-date/twitch-api-client'

const identifier = parseTwitchUserIdentifier('https://www.twitch.tv/example')
const user = identifier ? await resolveTwitchUser(identifier) : null

// Low-level access when needed
const api = getTwitchApiClient()
```
