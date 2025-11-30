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
  console.log(channel.contentDetails.relatedPlaylists.uploads)
}
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
  all: false // Set to true to fetch all items across pages
})) {
  console.log(item.contentDetails.videoId)
}
```

### Using the client directly

```typescript
import { youtubeClient } from '@shinju-date/youtube-api-client'

// Pass to other libraries that need a YouTube client
const scraper = new YouTubeScraper({ youtubeClient })
```

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
