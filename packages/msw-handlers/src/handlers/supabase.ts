// biome-ignore-all lint/suspicious/noExplicitAny: Mocking Supabase with any type for simplicity

import { HttpResponse, http } from 'msw'

// Mock data for Supabase tables
const mockChannels = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Daily Analytics Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Trending Topics Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Popular Content Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Test Channel Four',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
]

const mockThumbnails = [
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    etag: 'abc123',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440001',
    path: '/thumbnails/video1.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    etag: 'def456',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440002',
    path: '/thumbnails/video2.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    etag: 'ghi789',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440003',
    path: '/thumbnails/video3.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    etag: 'jkl012',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440004',
    path: '/thumbnails/video4.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    etag: 'mno345',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440005',
    path: '/thumbnails/video5.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-07T00:00:00.000Z',
    deleted_at: null,
    etag: 'pqr678',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440006',
    path: '/thumbnails/video6.jpg',
    updated_at: '2023-01-07T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-08T00:00:00.000Z',
    deleted_at: null,
    etag: 'stu901',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440007',
    path: '/thumbnails/video7.jpg',
    updated_at: '2023-01-08T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-09T00:00:00.000Z',
    deleted_at: null,
    etag: 'vwx234',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440008',
    path: '/thumbnails/video8.jpg',
    updated_at: '2023-01-09T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-10T00:00:00.000Z',
    deleted_at: null,
    etag: 'yza567',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440009',
    path: '/thumbnails/video9.jpg',
    updated_at: '2023-01-10T00:00:00.000Z',
    width: 1280,
  },
  {
    blur_data_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...',
    created_at: '2023-01-11T00:00:00.000Z',
    deleted_at: null,
    etag: 'bcd890',
    height: 720,
    id: '650e8400-e29b-41d4-a716-446655440010',
    path: '/thumbnails/video10.jpg',
    updated_at: '2023-01-11T00:00:00.000Z',
    width: 1280,
  },
]

const mockVideos = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT10M30S',
    id: '750e8400-e29b-41d4-a716-446655440001',
    published_at: '2023-01-01T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440001',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440001',
    title: 'Analytics Test Video #1',
    updated_at: '2023-01-01T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-02T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT15M45S',
    id: '750e8400-e29b-41d4-a716-446655440002',
    published_at: '2023-01-02T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440002',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440002',
    title: 'Trending Test Video #2',
    updated_at: '2023-01-02T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-03T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT8M15S',
    id: '750e8400-e29b-41d4-a716-446655440003',
    published_at: '2023-01-03T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440003',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440003',
    title: 'Popular Test Video #3',
    updated_at: '2023-01-03T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-04T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT12M30S',
    id: '750e8400-e29b-41d4-a716-446655440004',
    published_at: '2023-01-04T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440004',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440004',
    title: 'Test Video #4',
    updated_at: '2023-01-04T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-05T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT20M45S',
    id: '750e8400-e29b-41d4-a716-446655440005',
    published_at: '2023-01-05T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440001',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440005',
    title: 'Daily Test Video #5',
    updated_at: '2023-01-05T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-06T00:00:00.000Z',
    deleted_at: '2023-01-11T00:00:00.000Z',
    duration: 'PT18M20S',
    id: '750e8400-e29b-41d4-a716-446655440006',
    published_at: '2023-01-06T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440002',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440002',
    title: 'Deleted Video 2',
    updated_at: '2023-01-06T00:00:00.000Z',
    visible: false,
  },
  {
    created_at: '2023-01-07T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT14M22S',
    id: '750e8400-e29b-41d4-a716-446655440007',
    published_at: '2023-01-07T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440003',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440006',
    title: 'New Content Video #7',
    updated_at: '2023-01-07T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-08T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT9M45S',
    id: '750e8400-e29b-41d4-a716-446655440008',
    published_at: '2023-01-08T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440004',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440007',
    title: 'Tutorial Video #8',
    updated_at: '2023-01-08T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-09T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT22M10S',
    id: '750e8400-e29b-41d4-a716-446655440009',
    published_at: '2023-01-09T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440001',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440008',
    title: 'Analytics Deep Dive #9',
    updated_at: '2023-01-09T00:00:00.000Z',
    visible: true,
  },
  {
    created_at: '2023-01-10T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT16M33S',
    id: '750e8400-e29b-41d4-a716-446655440010',
    published_at: '2023-01-10T12:00:00.000Z',
    talent_id: '550e8400-e29b-41d4-a716-446655440002',
    thumbnail_id: '650e8400-e29b-41d4-a716-446655440009',
    title: 'Trending Topics #10',
    updated_at: '2023-01-10T00:00:00.000Z',
    visible: true,
  },
]

const mockYoutubeChannels = [
  {
    talent_id: '550e8400-e29b-41d4-a716-446655440001',
    youtube_channel_id: 'UCtest123',
    youtube_handle: '@dailyanalytics',
  },
  {
    talent_id: '550e8400-e29b-41d4-a716-446655440002',
    youtube_channel_id: 'UCtest456',
    youtube_handle: '@trendingtopics',
  },
  {
    talent_id: '550e8400-e29b-41d4-a716-446655440003',
    youtube_channel_id: 'UCtest789',
    youtube_handle: '@popularcontent',
  },
  {
    talent_id: '550e8400-e29b-41d4-a716-446655440004',
    youtube_channel_id: 'UCtest012',
    youtube_handle: '@testchannelfour',
  },
]

const mockYoutubeVideos = [
  {
    video_id: '750e8400-e29b-41d4-a716-446655440001',
    youtube_video_id: 'YT_video1abc',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440002',
    youtube_video_id: 'YT_video2def',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440003',
    youtube_video_id: 'YT_video3ghi',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440004',
    youtube_video_id: 'YT_video4jkl',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440005',
    youtube_video_id: 'YT_video5mno',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440006',
    youtube_video_id: 'YT_video6pqr',
  },
  // Additional test data for comprehensive testing
  {
    video_id: '750e8400-e29b-41d4-a716-446655440007',
    youtube_video_id: 'YT_newVideo01',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440008',
    youtube_video_id: 'YT_newVideo02',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440009',
    youtube_video_id: 'YT_newVideo03',
  },
  {
    video_id: '750e8400-e29b-41d4-a716-446655440010',
    youtube_video_id: 'YT_testVideo1',
  },
]

const mockTerms = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    id: '850e8400-e29b-41d4-a716-446655440001',
    readings: ['test', 'sample'],
    synonyms: ['example', 'demo'],
    term: 'Test Term',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-02T00:00:00.000Z',
    id: '850e8400-e29b-41d4-a716-446655440002',
    readings: ['mock', 'fake'],
    synonyms: ['simulated', 'dummy'],
    term: 'Mock Term',
    updated_at: '2023-01-02T00:00:00.000Z',
  },
  {
    created_at: '2023-01-03T00:00:00.000Z',
    id: '850e8400-e29b-41d4-a716-446655440003',
    readings: ['example', 'illustration'],
    synonyms: ['instance', 'case'],
    term: 'Example Term',
    updated_at: '2023-01-03T00:00:00.000Z',
  },
]

const mockTalents = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: '750e8400-e29b-41d4-a716-446655440001',
    name: 'Talent One',
    updated_at: '2023-01-01T00:00:00.000Z',
    youtube_channel_id: '550e8400-e29b-41d4-a716-446655440001',
  },
  {
    created_at: '2023-01-02T00:00:00.000Z',
    deleted_at: null,
    id: '750e8400-e29b-41d4-a716-446655440002',
    name: 'Talent Two',
    updated_at: '2023-01-02T00:00:00.000Z',
    youtube_channel_id: '550e8400-e29b-41d4-a716-446655440002',
  },
  {
    created_at: '2023-01-03T00:00:00.000Z',
    deleted_at: null,
    id: '750e8400-e29b-41d4-a716-446655440003',
    name: 'Talent Three',
    updated_at: '2023-01-03T00:00:00.000Z',
    youtube_channel_id: '550e8400-e29b-41d4-a716-446655440003',
  },
]

/**
 * Parse Supabase REST API query parameters
 */
function parseSupabaseQuery(url: URL) {
  const select = url.searchParams.get('select') || '*'
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  // Prefer header is preferred for count, but also check query param
  const prefer = url.searchParams.get('prefer') || ''
  const returnCount = prefer.includes('count=exact')

  // Get all query parameters as individual filters
  const filters: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) {
    if (!['select', 'limit', 'offset', 'prefer'].includes(key)) {
      // Handle Supabase query syntax like id.in.(1,2) where the filter is in the key
      if (key.includes('.')) {
        const parts = key.split('.')
        if (parts.length >= 2 && parts[0]) {
          const field = parts[0]
          const operator = parts.slice(1).join('.')
          filters[field] = operator + (value ? `.${value}` : '')
        }
      } else {
        // Handle regular field=value filters
        filters[key] = value
      }
    }
  }

  return { filters, limit, offset, returnCount, select }
}

/**
 * Apply filters and selections to mock data
 */
function applySupabaseFilters(
  data: any[],
  query: ReturnType<typeof parseSupabaseQuery>,
) {
  let filteredData = [...data]

  // Apply field-specific filters
  for (const [field, filterValue] of Object.entries(query.filters)) {
    if (filterValue.startsWith('eq.')) {
      // Handle equals filter (e.g., visible=eq.true)
      const value = filterValue.substring(3)
      const parsedValue =
        value === 'true'
          ? true
          : value === 'false'
            ? false
            : value === 'null'
              ? null
              : Number.isNaN(Number(value))
                ? value
                : Number(value)
      filteredData = filteredData.filter((item) => item[field] === parsedValue)
    } else if (filterValue.startsWith('is.')) {
      // Handle is filter (e.g., deleted_at=is.null)
      const value = filterValue.substring(3)
      if (value === 'null') {
        filteredData = filteredData.filter((item) => item[field] === null)
      }
    } else if (filterValue.startsWith('not.is.')) {
      // Handle not is filter (e.g., deleted_at=not.is.null)
      const value = filterValue.substring(7)
      if (value === 'null') {
        filteredData = filteredData.filter((item) => item[field] !== null)
      }
    } else if (filterValue.startsWith('in.')) {
      // Handle in filter (e.g., id=in.(1,2,3))
      const values = filterValue.substring(3)
      if (values.startsWith('(') && values.endsWith(')')) {
        const valueArray = values
          .slice(1, -1)
          .split(',')
          .map((v) => {
            const trimmed = v.trim()
            return Number.isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
          })
        filteredData = filteredData.filter((item) =>
          valueArray.includes(item[field]),
        )
      }
    }
  }

  // Apply limit
  if (query.limit) {
    const limitNum = parseInt(query.limit, 10)
    filteredData = filteredData.slice(0, limitNum)
  }

  // Apply offset
  if (query.offset) {
    const offsetNum = parseInt(query.offset, 10)
    filteredData = filteredData.slice(offsetNum)
  }

  return filteredData
}

/**
 * Handle Supabase select projection
 */
function applySelect(data: any[], selectStr: string) {
  if (selectStr === '*') {
    return data
  }

  return data.map((item) => {
    const result: any = {}
    const fields = selectStr.split(',').map((f) => f.trim())

    for (const field of fields) {
      // Handle nested selects like "thumbnails(path, blur_data_url)"
      const nestedMatch = field.match(/^(\w+)\(([^)]+)\)$/)
      if (nestedMatch) {
        const [, relationName, nestedFields] = nestedMatch
        if (relationName && nestedFields) {
          // For this mock, we'll simulate a simple join
          if (relationName === 'thumbnails' && item.thumbnail_id) {
            const thumbnail = mockThumbnails.find(
              (t) => t.id === item.thumbnail_id,
            )
            if (thumbnail) {
              const nestedFieldArray = nestedFields
                .split(',')
                .map((f) => f.trim())
              const nestedResult: any = {}
              for (const nf of nestedFieldArray) {
                if (nf in thumbnail) {
                  nestedResult[nf] = thumbnail[nf as keyof typeof thumbnail]
                }
              }
              result[relationName] = nestedResult
            } else {
              result[relationName] = null
            }
          }
        }
      } else if (field in item) {
        result[field] = item[field]
      }
    }

    return result
  })
}

export const supabaseHandlers = [
  // Videos table
  http.get('https://fake.supabase.test/rest/v1/videos', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    // Check if count is requested via Prefer header
    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockVideos, query)
    const count = filteredData.length

    // If this is a HEAD request, return empty body with count header
    if (
      request.method === 'HEAD' ||
      (returnCount && preferHeader.includes('head=true'))
    ) {
      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    }

    filteredData = applySelect(filteredData, query.select)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(
        0,
        filteredData.length - 1,
      )}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Videos table HEAD requests
  http.head('https://fake.supabase.test/rest/v1/videos', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const filteredData = applySupabaseFilters(mockVideos, query)
    const count = filteredData.length

    return new HttpResponse(null, {
      headers: {
        'Content-Range': `0-0/${count}`,
        'Content-Type': 'application/json',
      },
    })
  }),

  // Channels table
  http.get('https://fake.supabase.test/rest/v1/channels', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockChannels, query)
    const count = filteredData.length

    if (
      request.method === 'HEAD' ||
      (returnCount && preferHeader.includes('head=true'))
    ) {
      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    }

    filteredData = applySelect(filteredData, query.select)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(
        0,
        filteredData.length - 1,
      )}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Channels table HEAD requests
  http.head('https://fake.supabase.test/rest/v1/channels', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const filteredData = applySupabaseFilters(mockChannels, query)
    const count = filteredData.length

    return new HttpResponse(null, {
      headers: {
        'Content-Range': `0-0/${count}`,
        'Content-Type': 'application/json',
      },
    })
  }),

  // Thumbnails table
  http.get('https://fake.supabase.test/rest/v1/thumbnails', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockThumbnails, query)
    const count = filteredData.length

    if (
      request.method === 'HEAD' ||
      (returnCount && preferHeader.includes('head=true'))
    ) {
      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    }

    filteredData = applySelect(filteredData, query.select)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(
        0,
        filteredData.length - 1,
      )}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Terms table
  http.get('https://fake.supabase.test/rest/v1/terms', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockTerms, query)
    const count = filteredData.length

    if (
      request.method === 'HEAD' ||
      (returnCount && preferHeader.includes('head=true'))
    ) {
      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    }

    filteredData = applySelect(filteredData, query.select)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(
        0,
        filteredData.length - 1,
      )}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Terms table HEAD requests
  http.head('https://fake.supabase.test/rest/v1/terms', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const filteredData = applySupabaseFilters(mockTerms, query)
    const count = filteredData.length

    return new HttpResponse(null, {
      headers: {
        'Content-Range': `0-0/${count}`,
        'Content-Type': 'application/json',
      },
    })
  }),

  // Talents table
  http.get('https://fake.supabase.test/rest/v1/talents', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockTalents, query)
    const count = filteredData.length

    if (
      request.method === 'HEAD' ||
      (returnCount && preferHeader.includes('head=true'))
    ) {
      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    }

    filteredData = applySelect(filteredData, query.select)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(
        0,
        filteredData.length - 1,
      )}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Talents table HEAD requests
  http.head('https://fake.supabase.test/rest/v1/talents', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const filteredData = applySupabaseFilters(mockTalents, query)
    const count = filteredData.length

    return new HttpResponse(null, {
      headers: {
        'Content-Range': `0-0/${count}`,
        'Content-Type': 'application/json',
      },
    })
  }),

  // YouTube Channels Table
  http.get(
    'https://fake.supabase.test/rest/v1/youtube_channels',
    ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(mockYoutubeChannels, query)

      if (query.returnCount) {
        return HttpResponse.json(filteredData, {
          headers: {
            'Content-Range': `0-${filteredData.length - 1}/${
              filteredData.length
            }`,
          },
        })
      }

      return HttpResponse.json(filteredData)
    },
  ),

  http.head(
    'https://fake.supabase.test/rest/v1/youtube_channels',
    ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(mockYoutubeChannels, query)
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // YouTube Videos Table
  http.get(
    'https://fake.supabase.test/rest/v1/youtube_videos',
    ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(mockYoutubeVideos, query)

      if (query.returnCount) {
        return HttpResponse.json(filteredData, {
          headers: {
            'Content-Range': `0-${filteredData.length - 1}/${
              filteredData.length
            }`,
          },
        })
      }

      return HttpResponse.json(filteredData)
    },
  ),

  http.head(
    'https://fake.supabase.test/rest/v1/youtube_videos',
    ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(mockYoutubeVideos, query)
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // YouTube Videos POST (upsert/insert)
  http.post(
    'https://fake.supabase.test/rest/v1/youtube_videos',
    async ({ request }) => {
      const preferHeader = request.headers.get('prefer') || ''
      const body = (await request.json()) as any

      // Handle both single object and array of objects
      const items = Array.isArray(body) ? body : [body]

      // Mock upsert behavior: update existing or add new
      for (const item of items) {
        const existingIndex = mockYoutubeVideos.findIndex(
          (v) => v.video_id === item.video_id,
        )
        if (existingIndex !== -1) {
          // Update existing
          mockYoutubeVideos[existingIndex] = {
            ...mockYoutubeVideos[existingIndex],
            ...item,
          }
        } else {
          // Insert new
          mockYoutubeVideos.push(item)
        }
      }

      // Return the inserted/updated items if representation is requested
      if (preferHeader.includes('return=representation')) {
        return HttpResponse.json(items, {
          headers: {
            'Content-Type': 'application/json',
          },
          status: 201,
        })
      }

      return new HttpResponse(null, { status: 201 })
    },
  ),

  // YouTube Videos PATCH (update)
  http.patch(
    'https://fake.supabase.test/rest/v1/youtube_videos',
    async ({ request }) => {
      const url = new URL(request.url)
      const preferHeader = request.headers.get('prefer') || ''
      const query = parseSupabaseQuery(url)
      const body = (await request.json()) as any

      // Find matching records and update them
      const updatedItems: any[] = []
      for (const [field, filterValue] of Object.entries(query.filters)) {
        if (filterValue.startsWith('eq.')) {
          const value = filterValue.substring(3)
          const parsedValue =
            value === 'true'
              ? true
              : value === 'false'
                ? false
                : value === 'null'
                  ? null
                  : Number.isNaN(Number(value))
                    ? value
                    : Number(value)

          for (let i = 0; i < mockYoutubeVideos.length; i++) {
            const video = mockYoutubeVideos[i]
            if (video && (video as any)[field] === parsedValue) {
              mockYoutubeVideos[i] = {
                ...video,
                ...body,
              }
              updatedItems.push(mockYoutubeVideos[i])
            }
          }
        }
      }

      if (preferHeader.includes('return=representation')) {
        return HttpResponse.json(updatedItems, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }

      return new HttpResponse(null, { status: 204 })
    },
  ),

  // Authentication endpoints
  http.get(
    'https://fake.supabase.test/auth/v1/user',
    ({ request, cookies }) => {
      // Check for authentication in multiple ways:
      // 1. Environment variable for forced authentication
      // 2. Authorization header with bearer token
      // 3. Supabase auth cookies (pattern: sb-*-auth-token)
      const authHeader = request.headers.get('authorization')
      const hasValidToken =
        authHeader?.startsWith('Bearer ') &&
        authHeader.includes('mock_access_token')

      const hasAuthCookie = Object.keys(cookies).some(
        (key) =>
          (key.includes('sb-') && key.includes('-auth-token')) ||
          key === 'sb-access-token',
      )

      const isAuthenticated =
        process.env['MSW_SUPABASE_AUTHENTICATED'] === 'true' ||
        hasValidToken ||
        hasAuthCookie

      if (!isAuthenticated) {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      return HttpResponse.json({
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        aud: 'authenticated',
        confirmed_at: '2023-01-01T00:00:00.000Z',
        created_at: '2023-01-01T00:00:00.000Z',
        email: 'admin@example.com',
        email_confirmed_at: '2023-01-01T00:00:00.000Z',
        id: 'mock-user-id',
        identities: [
          {
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'mock-user-id',
            identity_data: {
              email: 'admin@example.com',
              sub: 'mock-user-id',
            },
            last_sign_in_at: '2023-01-01T00:00:00.000Z',
            provider: 'email',
            updated_at: '2023-01-01T00:00:00.000Z',
            user_id: 'mock-user-id',
          },
        ],
        last_sign_in_at: '2023-01-01T00:00:00.000Z',
        phone: '',
        role: 'authenticated',
        updated_at: '2023-01-01T00:00:00.000Z',
        user_metadata: {},
      })
    },
  ),

  http.post('https://fake.supabase.test/auth/v1/token', async ({ request }) => {
    const url = new URL(request.url)
    const grantType = url.searchParams.get('grant_type')

    if (grantType === 'password') {
      const body = (await request.json()) as {
        email?: string
        password?: string
      }

      if (
        body.email === 'admin@example.com' &&
        body.password === 'password123'
      ) {
        const headers = new Headers({
          'Content-Type': 'application/json',
        })
        headers.append(
          'Set-Cookie',
          'sb-access-token=mock_access_token; Path=/; Max-Age=3600; SameSite=Lax',
        )
        headers.append(
          'Set-Cookie',
          'sb-refresh-token=mock_refresh_token; Path=/; Max-Age=604800; SameSite=Lax',
        )

        return HttpResponse.json(
          {
            access_token: 'mock_access_token',
            expires_at: 9999999999,
            expires_in: 3600,
            refresh_token: 'mock_refresh_token',
            token_type: 'bearer',
            user: {
              app_metadata: {
                provider: 'email',
                providers: ['email'],
              },
              aud: 'authenticated',
              confirmed_at: '2023-01-01T00:00:00.000Z',
              created_at: '2023-01-01T00:00:00.000Z',
              email: 'admin@example.com',
              email_confirmed_at: '2023-01-01T00:00:00.000Z',
              id: 'mock-user-id',
              identities: [
                {
                  created_at: '2023-01-01T00:00:00.000Z',
                  id: 'mock-user-id',
                  identity_data: {
                    email: 'admin@example.com',
                    sub: 'mock-user-id',
                  },
                  last_sign_in_at: '2023-01-01T00:00:00.000Z',
                  provider: 'email',
                  updated_at: '2023-01-01T00:00:00.000Z',
                  user_id: 'mock-user-id',
                },
              ],
              last_sign_in_at: '2023-01-01T00:00:00.000Z',
              phone: '',
              role: 'authenticated',
              updated_at: '2023-01-01T00:00:00.000Z',
              user_metadata: {},
            },
          },
          {
            headers,
            status: 200,
          },
        )
      }
      return HttpResponse.json(
        {
          error: 'invalid_grant',
          error_description: 'Invalid credentials',
        },
        { status: 400 },
      )
    }

    return HttpResponse.json(
      {
        error: 'unsupported_grant_type',
        error_description: 'Unsupported grant_type',
      },
      { status: 400 },
    )
  }),

  // Session endpoint - for refreshing tokens
  http.get('https://fake.supabase.test/auth/v1/session', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    const hasValidToken =
      authHeader?.startsWith('Bearer ') && authHeader.includes('mock')

    if (
      !hasValidToken &&
      process.env['MSW_SUPABASE_AUTHENTICATED'] !== 'true'
    ) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return HttpResponse.json({
      access_token: 'mock_access_token',
      expires_at: 9999999999,
      expires_in: 3600,
      refresh_token: 'mock_refresh_token',
      token_type: 'bearer',
      user: {
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        aud: 'authenticated',
        confirmed_at: '2023-01-01T00:00:00.000Z',
        created_at: '2023-01-01T00:00:00.000Z',
        email: 'admin@example.com',
        email_confirmed_at: '2023-01-01T00:00:00.000Z',
        id: 'mock-user-id',
        identities: [
          {
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'mock-user-id',
            identity_data: {
              email: 'admin@example.com',
              sub: 'mock-user-id',
            },
            last_sign_in_at: '2023-01-01T00:00:00.000Z',
            provider: 'email',
            updated_at: '2023-01-01T00:00:00.000Z',
            user_id: 'mock-user-id',
          },
        ],
        last_sign_in_at: '2023-01-01T00:00:00.000Z',
        phone: '',
        role: 'authenticated',
        updated_at: '2023-01-01T00:00:00.000Z',
        user_metadata: {},
      },
    })
  }),

  http.post('https://fake.supabase.test/auth/v1/logout', () => {
    const headers = new Headers()
    headers.append(
      'Set-Cookie',
      'sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    )
    headers.append(
      'Set-Cookie',
      'sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    )

    return new HttpResponse(null, {
      headers,
      status: 204,
    })
  }),

  // Health check endpoint - simple SELECT query
  http.get('https://fake.supabase.test/rest/v1/*', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    // For health checks or other simple queries, return empty success
    if (query.limit === '1') {
      return HttpResponse.json([])
    }

    return HttpResponse.json([])
  }),

  // RPC endpoints
  http.post(
    'https://fake.supabase.test/rest/v1/rpc/suggestions_v2',
    async () => {
      const suggestions = [
        {
          created_at: '2023-01-01T00:00:00.000Z',
          id: '950e8400-e29b-41d4-a716-446655440001',
          kind: 'Test',
          name: 'Test Suggestion',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ]

      return HttpResponse.json(suggestions)
    },
  ),

  http.post(
    'https://fake.supabase.test/rest/v1/rpc/search_videos_v2',
    async ({ request }) => {
      const body = (await request.json()) as {
        channel_ids?: string[]
        perpage?: number
        query?: string
        until?: string
      }

      // Build mock response combining videos, talents, thumbnails, and youtube_videos
      const results = mockVideos
        .filter((video) => video.deleted_at === null && video.visible)
        .slice(0, body.perpage || 10)
        .map((video) => {
          const talent = mockTalents.find((t) => t.id === video.talent_id)
          const thumbnail = mockThumbnails.find(
            (th) => th.id === video.thumbnail_id,
          )
          const youtubeVideo = mockYoutubeVideos.find(
            (yv) => yv.video_id === video.id,
          )

          return {
            duration: video.duration,
            id: video.id,
            published_at: video.published_at,
            status: 'published',
            talent: talent
              ? {
                  id: talent.id,
                  name: talent.name,
                }
              : null,
            thumbnail: thumbnail
              ? {
                  blur_data_url: thumbnail.blur_data_url,
                  height: thumbnail.height,
                  id: thumbnail.id,
                  path: thumbnail.path,
                  width: thumbnail.width,
                }
              : null,
            title: video.title,
            youtube_video: youtubeVideo
              ? {
                  youtube_video_id: youtubeVideo.youtube_video_id,
                }
              : null,
          }
        })

      return HttpResponse.json(results)
    },
  ),

  // Storage endpoints
  http.post(
    'https://fake.supabase.test/storage/v1/object/sign/thumbnails/*',
    async ({ request }) => {
      const url = new URL(request.url)
      const path = url.pathname.replace(
        '/storage/v1/object/sign/thumbnails/',
        '',
      )

      // Return a mock signed URL
      return HttpResponse.json({
        signedURL: `https://fake.supabase.test/storage/v1/object/public/thumbnails/${path}`,
      })
    },
  ),

  http.get(
    'https://fake.supabase.test/storage/v1/object/public/thumbnails/*',
    async () => {
      const dummyImage =
        '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" />'

      return new HttpResponse(dummyImage, {
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      })
    },
  ),

  // Silence telemetry and external service warnings
  http.post('https://telemetry.nextjs.org/api/v1/record', async () => {
    return new HttpResponse(null, { status: 200 })
  }),

  http.get('https://registry.npmjs.org/-/package/next/dist-tags', async () => {
    return HttpResponse.json({
      latest: '16.0.3',
    })
  }),
]
