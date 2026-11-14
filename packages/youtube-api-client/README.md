# @shinju-date/youtube-api-client

A shared YouTube API client package with Zod runtime validation for the SHINJU DATE monorepo.

## Features

- **Type-safe**: Full TypeScript support with inferred types from Zod schemas
- **Runtime Validation**: All API responses are validated using Zod schemas
- **DRY**: Centralized YouTube API logic for reuse across applications
- **Lazy Initialization**: Client is created only when needed for better testability
- **Error Handling**: Robust validation with automatic filtering of invalid responses

## Installation

This is a private workspace package. To use it in your app:

```json
{
  "dependencies": {
    "@shinju-date/youtube-api-client": "workspace:*"
  }
}
```

## Usage

### Import the client and functions

```typescript
import {
  youtubeClient,
  getChannels,
  getVideos,
  getVideoIds,
  getPlaylistItems,
  type FilteredYouTubeChannel,
  type FilteredYouTubeVideo,
  type FilteredYouTubePlaylistItem,
} from '@shinju-date/youtube-api-client'
```

### Get YouTube channels

```typescript
const channelIds = ['UCxxxxxx', 'UCyyyyyy']

for await (const channel of getChannels({ ids: channelIds })) {
  console.log(channel.id)
  console.log(channel.snippet.title)
  console.log(channel.contentDetails.relatedPlaylists.uploads)
}
```

### Resolve channel from user input (ID, handle, or URL)

```typescript
import {
  parseYouTubeChannelIdentifier,
  resolveYouTubeChannel,
  getChannelByHandle,
} from '@shinju-date/youtube-api-client'

const identifier = parseYouTubeChannelIdentifier(
  'https://www.youtube.com/@example',
)
// => { kind: 'handle', handle: 'example' }

if (identifier) {
  const channel = await resolveYouTubeChannel(identifier)
  console.log(channel?.id, channel?.snippet.title, channel?.snippet.customUrl)
}

// Or look up by handle directly
const byHandle = await getChannelByHandle({ handle: '@example' })
```

### Get YouTube videos

```typescript
const videoIds = ['dQw4w9WgXcQ', 'jNQXAC9IVRw']

for await (const video of getVideos({ ids: videoIds })) {
  console.log(video.id)
  console.log(video.snippet.title)
  console.log(video.snippet.publishedAt)
}
```

### Get playlist items

```typescript
const playlistId = 'PLxxxxxx'

for await (const item of getPlaylistItems({
  playlistID: playlistId,
  all: false, // Set to true to fetch all items across pages
})) {
  console.log(item.contentDetails.videoId)
}
```

### Check which videos still exist

```typescript
// Requests only the `id` part: the cheapest way to detect deleted/private videos
for await (const id of getVideoIds({ ids: videoIds })) {
  console.log(`${id} is still available`)
}
```

### Interpret a video resource

Pure helpers that turn a YouTube video resource into the values SHINJU DATE stores:

```typescript
import {
  getPublishedAt,
  getVideoKind,
  getVideoStatus,
} from '@shinju-date/youtube-api-client'

getVideoStatus(video, now) // 'UPCOMING' | 'LIVE' | 'ENDED' | 'PUBLISHED'
getVideoKind(video) // 'standard' | 'short'
getPublishedAt(video) // start of the broadcast, or the publication time
```

### Using a specific client

Every function uses the shared client by default. Pass `client` to use another one (for example a fake in tests):

```typescript
import { createYouTubeClient, getVideos } from '@shinju-date/youtube-api-client'

const client = createYouTubeClient()

for await (const video of getVideos({ client, ids: videoIds })) {
  // ...
}
```

`getPlaylistItems` also accepts `maxResults` to control the page size.

## Environment Variables

The package requires a Google API key to be set:

```bash
GOOGLE_API_KEY=your_api_key_here
```

## Validation

All responses are validated using Zod schemas:

- `YouTubeChannelSchema`: Validates channel responses
- `YouTubeVideoSchema`: Validates video responses
- `YouTubePlaylistItemSchema`: Validates playlist item responses

Invalid responses are automatically filtered out and will not be yielded by the generator functions.

## Testing

The package includes comprehensive unit tests for schema validation:

```bash
pnpm test
```

## Building

Build the package:

```bash
pnpm build
```

## License

MIT
