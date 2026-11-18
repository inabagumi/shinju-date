# @shinju-date/youtube-api-client

A shared YouTube Data API client package for the SHINJU DATE monorepo.

## Features

- **Type-safe**: Returns only the fetched items that have the fields SHINJU DATE requires, typed so that those fields are present
- **DRY**: Centralized YouTube API logic for reuse across applications
- **Lazy Initialization**: Client is created only when needed for better testability

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
} from '@shinju-date/youtube-api-client'

const identifier = parseYouTubeChannelIdentifier(
  'https://www.youtube.com/@example',
)
// => { kind: 'handle', handle: 'example' }

if (identifier) {
  const channel = await resolveYouTubeChannel(identifier)
  console.log(channel?.id, channel?.snippet.title, channel?.snippet.customUrl)
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
import { youtube_v3 as youtube } from '@googleapis/youtube'
import { getVideos } from '@shinju-date/youtube-api-client'

const client = new youtube.Youtube({ auth: apiKey })

for await (const video of getVideos({ client, ids: videoIds })) {
  // ...
}
```

`getPlaylistItems` also accepts `maxResults` to control the page size.

### Bound the requests in flight

`getChannels`, `getVideos` and `getVideoIds` accept any number of IDs and split them into batches of `YOUTUBE_DATA_API_MAX_RESULTS` (50). The batches are requested one after another. Pass `schedule` to run each request through it instead: every batch is requested at once, and `schedule` decides how many requests run at a time.

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

## Environment Variables

The package requires a Google API key to be set:

```bash
GOOGLE_API_KEY=your_api_key_here
```

## Filtering

Of the fetched items, only those that have the fields below are returned:

- Channels (`FilteredYouTubeChannel`): the channel ID, the uploads playlist ID and the title
- Videos (`FilteredYouTubeVideo`): the video ID and the publication time
- Playlist items (`FilteredYouTubePlaylistItem`): the video ID

Items without them are left out.

## Testing

Run the unit tests:

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
