# @shinju-date/twitch-api-client

A shared Twitch Helix API client package with Zod runtime validation for the SHINJU DATE monorepo.

## Features

- **App Access Token** management via Client Credentials
- **Users / Videos / Clips** lookup for admin registration and manual sync
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
  getClips,
  twitchDurationToISO8601,
} from '@shinju-date/twitch-api-client'

const identifier = parseTwitchUserIdentifier('https://www.twitch.tv/example')
const user = identifier ? await resolveTwitchUser(identifier) : null

for await (const video of getVideos({ ids: ['123456'] })) {
  console.log(video.title, twitchDurationToISO8601(video.duration))
}
```
