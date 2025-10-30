// biome-ignore-all lint/suspicious/noExplicitAny: Mocking YouTube API with any type for simplicity

import { HttpResponse, http } from 'msw'

// Mock YouTube channels data
const mockYouTubeChannels: any[] = [
  {
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UUtest123_uploads',
      },
    },
    id: 'UCtest123',
  },
  {
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UUtest456_uploads',
      },
    },
    id: 'UCtest456',
  },
  {
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UUtest789_uploads',
      },
    },
    id: 'UCtest789',
  },
  {
    contentDetails: {
      relatedPlaylists: {
        uploads: 'UUtest012_uploads',
      },
    },
    id: 'UCtest012',
  },
]

// Mock YouTube playlist items (videos in a channel's uploads playlist)
const mockYouTubePlaylistItems: Record<string, any[]> = {
  UUtest012_uploads: [
    {
      contentDetails: {
        videoId: 'YT_video4jkl',
      },
      id: 'playlist_item_4',
    },
    {
      contentDetails: {
        videoId: 'YT_testVideo1',
      },
      id: 'playlist_item_10',
    },
  ],
  UUtest123_uploads: [
    {
      contentDetails: {
        videoId: 'YT_video1abc',
      },
      id: 'playlist_item_1',
    },
    {
      contentDetails: {
        videoId: 'YT_video5mno',
      },
      id: 'playlist_item_5',
    },
    {
      contentDetails: {
        videoId: 'YT_newVideo03',
      },
      id: 'playlist_item_9',
    },
  ],
  UUtest456_uploads: [
    {
      contentDetails: {
        videoId: 'YT_video2def',
      },
      id: 'playlist_item_2',
    },
    {
      contentDetails: {
        videoId: 'YT_video6pqr',
      },
      id: 'playlist_item_6',
    },
    {
      contentDetails: {
        videoId: 'YT_newVideo02',
      },
      id: 'playlist_item_8',
    },
  ],
  UUtest789_uploads: [
    {
      contentDetails: {
        videoId: 'YT_video3ghi',
      },
      id: 'playlist_item_3',
    },
    {
      contentDetails: {
        videoId: 'YT_newVideo01',
      },
      id: 'playlist_item_7',
    },
  ],
}

// Mock YouTube videos data
const mockYouTubeVideos: Record<string, any> = {
  YT_newVideo01: {
    contentDetails: {
      duration: 'PT14M22S',
    },
    id: 'YT_newVideo01',
    snippet: {
      publishedAt: '2023-01-07T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_newVideo01/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_newVideo01/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'New Content Video #7',
    },
  },
  YT_newVideo02: {
    contentDetails: {
      duration: 'PT9M45S',
    },
    id: 'YT_newVideo02',
    snippet: {
      publishedAt: '2023-01-08T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_newVideo02/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_newVideo02/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Tutorial Video #8',
    },
  },
  YT_newVideo03: {
    contentDetails: {
      duration: 'PT22M10S',
    },
    id: 'YT_newVideo03',
    snippet: {
      publishedAt: '2023-01-09T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_newVideo03/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_newVideo03/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Analytics Deep Dive #9',
    },
  },
  YT_testVideo1: {
    contentDetails: {
      duration: 'PT16M33S',
    },
    id: 'YT_testVideo1',
    snippet: {
      publishedAt: '2023-01-10T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_testVideo1/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_testVideo1/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Trending Topics #10',
    },
  },
  YT_video1abc: {
    contentDetails: {
      duration: 'PT10M30S',
    },
    id: 'YT_video1abc',
    snippet: {
      publishedAt: '2023-01-01T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video1abc/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video1abc/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Analytics Test Video #1',
    },
  },
  YT_video2def: {
    contentDetails: {
      duration: 'PT15M45S',
    },
    id: 'YT_video2def',
    snippet: {
      publishedAt: '2023-01-02T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video2def/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video2def/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Trending Test Video #2',
    },
  },
  YT_video3ghi: {
    contentDetails: {
      duration: 'PT8M15S',
    },
    id: 'YT_video3ghi',
    snippet: {
      publishedAt: '2023-01-03T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video3ghi/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video3ghi/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Popular Test Video #3',
    },
  },
  YT_video4jkl: {
    contentDetails: {
      duration: 'PT12M30S',
    },
    id: 'YT_video4jkl',
    snippet: {
      publishedAt: '2023-01-04T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video4jkl/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video4jkl/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Test Video #4',
    },
  },
  YT_video5mno: {
    contentDetails: {
      duration: 'PT20M45S',
    },
    id: 'YT_video5mno',
    snippet: {
      publishedAt: '2023-01-05T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video5mno/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video5mno/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Daily Test Video #5',
    },
  },
  YT_video6pqr: {
    contentDetails: {
      duration: 'PT18M20S',
    },
    id: 'YT_video6pqr',
    snippet: {
      publishedAt: '2023-01-06T12:00:00.000Z',
      thumbnails: {
        high: {
          height: 360,
          url: 'https://i.ytimg.com/vi/YT_video6pqr/hqdefault.jpg',
          width: 480,
        },
        maxres: {
          height: 720,
          url: 'https://i.ytimg.com/vi/YT_video6pqr/maxresdefault.jpg',
          width: 1280,
        },
      },
      title: 'Deleted Video 2',
    },
  },
}

/**
 * Parse YouTube Data API query parameters
 */
function parseYouTubeQuery(url: URL) {
  const id = url.searchParams.get('id')
  const playlistId = url.searchParams.get('playlistId')
  const part = url.searchParams.get('part')?.split(',') || []
  const maxResults = Number.parseInt(
    url.searchParams.get('maxResults') || '50',
    10,
  )
  const pageToken = url.searchParams.get('pageToken')

  return { id, maxResults, pageToken, part, playlistId }
}

export const youtubeHandlers = [
  // YouTube Data API - channels.list
  http.get('https://www.googleapis.com/youtube/v3/channels', ({ request }) => {
    const url = new URL(request.url)
    const { id } = parseYouTubeQuery(url)

    if (!id) {
      return HttpResponse.json(
        { error: { code: 400, message: 'Required parameter: id' } },
        { status: 400 },
      )
    }

    const channelIds = id.split(',')
    const items = channelIds
      .map((channelId) =>
        mockYouTubeChannels.find((channel) => channel.id === channelId.trim()),
      )
      .filter(Boolean)

    return HttpResponse.json({
      items,
      kind: 'youtube#channelListResponse',
      pageInfo: {
        resultsPerPage: items.length,
        totalResults: items.length,
      },
    })
  }),

  // YouTube Data API - playlistItems.list
  http.get(
    'https://www.googleapis.com/youtube/v3/playlistItems',
    ({ request }) => {
      const url = new URL(request.url)
      const { playlistId, maxResults, pageToken } = parseYouTubeQuery(url)

      if (!playlistId) {
        return HttpResponse.json(
          { error: { code: 400, message: 'Required parameter: playlistId' } },
          { status: 400 },
        )
      }

      const items = mockYouTubePlaylistItems[playlistId] || []
      const startIndex = pageToken ? Number.parseInt(pageToken, 10) : 0
      const paginatedItems = items.slice(startIndex, startIndex + maxResults)
      const nextPageToken =
        startIndex + maxResults < items.length
          ? String(startIndex + maxResults)
          : undefined

      return HttpResponse.json({
        items: paginatedItems,
        kind: 'youtube#playlistItemListResponse',
        ...(nextPageToken ? { nextPageToken } : {}),
        pageInfo: {
          resultsPerPage: paginatedItems.length,
          totalResults: items.length,
        },
      })
    },
  ),

  // YouTube Data API - videos.list
  http.get('https://www.googleapis.com/youtube/v3/videos', ({ request }) => {
    const url = new URL(request.url)
    const { id } = parseYouTubeQuery(url)

    if (!id) {
      return HttpResponse.json(
        { error: { code: 400, message: 'Required parameter: id' } },
        { status: 400 },
      )
    }

    const videoIds = id.split(',')
    const items = videoIds
      .map((videoId) => mockYouTubeVideos[videoId.trim()])
      .filter(Boolean)

    return HttpResponse.json({
      items,
      kind: 'youtube#videoListResponse',
      pageInfo: {
        resultsPerPage: items.length,
        totalResults: items.length,
      },
    })
  }),

  // Mock thumbnail image downloads
  http.get('https://i.ytimg.com/vi/:videoId/:size', ({ params }) => {
    // Return a simple 1x1 pixel transparent PNG
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    )

    return new HttpResponse(transparentPng, {
      headers: {
        'Content-Type': 'image/png',
        ETag: `"${params['videoId']}-${params['size']}"`,
      },
    })
  }),
]
