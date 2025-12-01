# Scraper API Redesign - Interface and Usage Examples

This document demonstrates the new callback-based scraper API interface that provides better separation of concerns and concurrency control.

## Interface

```typescript
interface YouTubeScraper extends AsyncDisposable {
  /**
   * Scrape new videos from a playlist
   * @param params - Parameters containing playlistId
   * @param onNewVideos - Callback to handle batches of new videos
   */
  scrapeNewVideos(
    params: { playlistId: string },
    onNewVideos: (videos: YouTubeVideo[]) => Promise<void>
  ): Promise<void>

  /**
   * Scrape updated videos from a playlist (all videos)
   * @param params - Parameters containing playlistId
   * @param onUpdatedVideos - Callback to handle batches of updated videos
   */
  scrapeUpdatedVideos(
    params: { playlistId: string },
    onUpdatedVideos: (videos: YouTubeVideo[]) => Promise<void>
  ): Promise<void>
}
```

## Usage Examples

### Basic Usage: Scraping New Videos

```typescript
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { youtubeClient } from '@/lib/youtube'

// Create scraper with concurrency control
await using scraper = new YouTubeScraper({
  youtubeClient,
  concurrency: 5, // Optional: control concurrent API calls
})

// Scrape new videos with callback
await scraper.scrapeNewVideos({ playlistId }, async (videos) => {
  console.log(`Received ${videos.length} new videos`)
  
  // Your application logic here
  await saveVideosToDatabase(videos)
})
```

### Advanced Usage: Scraping with Database Operations

```typescript
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import {
  getSavedVideos,
  upsertThumbnails,
  upsertVideos,
} from '@/lib/database'
import { Thumbnail, processVideos } from '@/lib/video-operations'
import { youtubeClient } from '@/lib/youtube'
import { supabaseClient } from '@/lib/supabase'
import { Temporal } from 'temporal-polyfill'

await using scraper = new YouTubeScraper({ youtubeClient, concurrency: 5 })

const currentDateTime = Temporal.Now.instant()
const playlistId = 'UU_channel_uploads_playlist_id'
const scrapedVideos = []

await scraper.scrapeNewVideos({ playlistId }, async (videos) => {
  // 1. Get existing videos from database
  const videoIDs = videos.map((video) => video.id)
  const savedVideos = await Array.fromAsync(
    getSavedVideos(supabaseClient, videoIDs),
  )

  // 2. Process and upload thumbnails
  const thumbnails = await Thumbnail.upsertThumbnails({
    currentDateTime,
    originalVideos: videos,
    savedVideos,
    supabaseClient,
    upsertToDatabase: (values) => upsertThumbnails(supabaseClient, values),
  })

  // 3. Process video data (new and updated)
  const videoDataWithYouTubeIds = processVideos({
    currentDateTime,
    originalVideos: videos,
    savedVideos,
    talentId: 'talent-uuid',
    thumbnails,
  })

  // 4. Save to database
  if (videoDataWithYouTubeIds.length > 0) {
    const values = videoDataWithYouTubeIds.map((item) => item.value)
    const youtubeVideoIds = videoDataWithYouTubeIds.map(
      (item) => item.youtubeVideoId,
    )

    const savedResults = await upsertVideos(
      supabaseClient,
      values,
      youtubeVideoIds,
      'youtube-channel-id',
    )
    
    scrapedVideos.push(...savedResults)
  }
})

console.log(`Total videos processed: ${scrapedVideos.length}`)
```

### Multiple Channels with Queue

```typescript
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import PQueue from 'p-queue'

// Queue for processing multiple channels sequentially
const queue = new PQueue({
  concurrency: 1,
  interval: 250,
})

const channels = [
  { id: 'channel1', playlistId: 'UU_playlist1' },
  { id: 'channel2', playlistId: 'UU_playlist2' },
  { id: 'channel3', playlistId: 'UU_playlist3' },
]

const results = await Promise.allSettled(
  channels.map((channel) =>
    queue.add(async () => {
      await using scraper = new YouTubeScraper({ youtubeClient, concurrency: 5 })
      
      const videos = []
      
      await scraper.scrapeNewVideos(
        { playlistId: channel.playlistId },
        async (scrapedVideos) => {
          await processAndSaveVideos(channel.id, scrapedVideos)
          videos.push(...scrapedVideos)
        }
      )
      
      return { channelId: channel.id, count: videos.length }
    })
  )
)

// Handle results
for (const result of results) {
  if (result.status === 'fulfilled') {
    console.log(`Channel ${result.value.channelId}: ${result.value.count} videos`)
  } else {
    console.error('Channel failed:', result.reason)
  }
}
```

## Key Benefits

### 1. Separation of Concerns
- **YouTube API Operations**: Handled by `@shinju-date/youtube-scraper`
- **Database Operations**: Handled by `apps/batch/lib/database`
- **Application Logic**: Implemented in callbacks

### 2. Concurrency Control
- Built-in p-queue for rate limiting
- Configurable concurrency level
- Prevents API quota exhaustion

### 3. Resource Management
- AsyncDisposable pattern ensures proper cleanup
- Automatic queue draining on disposal
- Using statement (`await using`) for automatic resource management

### 4. Testability
- Pure functions for video processing
- Mockable database operations
- Clear interfaces for testing

### 5. Flexibility
- Callbacks allow custom side effects
- No tight coupling to specific storage
- Reusable across different use cases

## Migration from Old API

### Before (Old Scraper)

```typescript
import { scrape } from '@/lib/scraper'

const videos = await scrape({
  channel: originalChannel,
  currentDateTime,
  savedYouTubeChannel: {
    id: ytChannel.id,
    talent_id: savedTalent.id,
    youtube_channel_id: ytChannel.youtube_channel_id,
  },
  supabaseClient,
  youtubeClient,
})
```

### After (New Scraper)

```typescript
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { getSavedVideos, upsertVideos } from '@/lib/database'
import { Thumbnail, processVideos } from '@/lib/video-operations'

await using scraper = new YouTubeScraper({ youtubeClient, concurrency: 5 })
const playlistId = originalChannel.contentDetails.relatedPlaylists.uploads

await scraper.scrapeNewVideos({ playlistId }, async (videos) => {
  // Your custom logic here
  const videoIDs = videos.map((video) => video.id)
  const savedVideos = await Array.fromAsync(
    getSavedVideos(supabaseClient, videoIDs)
  )
  
  const thumbnails = await Thumbnail.upsertThumbnails({
    currentDateTime,
    originalVideos: videos,
    savedVideos,
    supabaseClient,
    upsertToDatabase: (values) => upsertThumbnails(supabaseClient, values),
  })
  
  const videoData = processVideos({
    currentDateTime,
    originalVideos: videos,
    savedVideos,
    talentId: savedTalent.id,
    thumbnails,
  })
  
  if (videoData.length > 0) {
    await upsertVideos(
      supabaseClient,
      videoData.map(item => item.value),
      videoData.map(item => item.youtubeVideoId),
      ytChannel.id,
    )
  }
})
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Application Layer (route.ts)                │
│  - Orchestrates scraping workflow                        │
│  - Handles errors and logging                            │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ uses
                  ▼
┌─────────────────────────────────────────────────────────┐
│         @shinju-date/youtube-scraper                     │
│  - scrapeNewVideos(params, callback)                     │
│  - scrapeUpdatedVideos(params, callback)                 │
│  - Concurrency control (p-queue)                         │
│  - AsyncDisposable pattern                               │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ calls back to
                  ▼
┌─────────────────────────────────────────────────────────┐
│            Callback Functions                            │
│  - Process videos with application logic                 │
│  - Call database operations                              │
│  - Handle thumbnails                                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ uses
                  ▼
┌─────────────────────────────────────────────────────────┐
│        apps/batch/lib/database                           │
│  - getSavedVideos(supabaseClient, ids)                   │
│  - upsertThumbnails(supabaseClient, values)              │
│  - upsertVideos(supabaseClient, values, ids, channelId)  │
└─────────────────────────────────────────────────────────┘
```
