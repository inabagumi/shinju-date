// biome-ignore-all lint/suspicious/noExplicitAny: Mocking Supabase with any type for simplicity

import { HttpResponse, http } from 'msw'

// Mock data for Supabase tables
const mockChannels = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 1,
    name: 'Daily Analytics Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 2,
    name: 'Trending Topics Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 3,
    name: 'Popular Content Channel',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 4,
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
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
    path: '/thumbnails/video5.jpg',
    updated_at: '2023-01-01T00:00:00.000Z',
    width: 1280,
  },
]

const mockVideos = [
  {
    channel_id: 1,
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT10M30S',
    id: 1,
    published_at: '2023-01-01T12:00:00.000Z',
    thumbnail_id: 1,
    title: 'Analytics Test Video #1',
    updated_at: '2023-01-01T00:00:00.000Z',
    visible: true,
  },
  {
    channel_id: 2,
    created_at: '2023-01-02T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT15M45S',
    id: 2,
    published_at: '2023-01-02T12:00:00.000Z',
    thumbnail_id: 2,
    title: 'Trending Test Video #2',
    updated_at: '2023-01-02T00:00:00.000Z',
    visible: true,
  },
  {
    channel_id: 3,
    created_at: '2023-01-03T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT8M15S',
    id: 3,
    published_at: '2023-01-03T12:00:00.000Z',
    thumbnail_id: 3,
    title: 'Popular Test Video #3',
    updated_at: '2023-01-03T00:00:00.000Z',
    visible: true,
  },
  {
    channel_id: 4,
    created_at: '2023-01-04T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT12M30S',
    id: 4,
    published_at: '2023-01-04T12:00:00.000Z',
    thumbnail_id: 4,
    title: 'Test Video #4',
    updated_at: '2023-01-04T00:00:00.000Z',
    visible: true,
  },
  {
    channel_id: 1,
    created_at: '2023-01-05T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT20M45S',
    id: 5,
    published_at: '2023-01-05T12:00:00.000Z',
    thumbnail_id: 5,
    title: 'Daily Test Video #5',
    updated_at: '2023-01-05T00:00:00.000Z',
    visible: true,
  },
  {
    channel_id: 2,
    created_at: '2023-01-06T00:00:00.000Z',
    deleted_at: '2023-01-11T00:00:00.000Z',
    duration: 'PT18M20S',
    id: 6,
    published_at: '2023-01-06T12:00:00.000Z',
    thumbnail_id: 2,
    title: 'Deleted Video 2',
    updated_at: '2023-01-06T00:00:00.000Z',
    visible: false,
  },
]

const mockTerms = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    id: 1,
    readings: ['test', 'sample'],
    synonyms: ['example', 'demo'],
    term: 'Test Term',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-02T00:00:00.000Z',
    id: 2,
    readings: ['mock', 'fake'],
    synonyms: ['simulated', 'dummy'],
    term: 'Mock Term',
    updated_at: '2023-01-02T00:00:00.000Z',
  },
  {
    created_at: '2023-01-03T00:00:00.000Z',
    id: 3,
    readings: ['example', 'illustration'],
    synonyms: ['instance', 'case'],
    term: 'Example Term',
    updated_at: '2023-01-03T00:00:00.000Z',
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
  http.get('*/rest/v1/videos', ({ request }) => {
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
  http.head('*/rest/v1/videos', ({ request }) => {
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
  http.get('*/rest/v1/channels', ({ request }) => {
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
  http.head('*/rest/v1/channels', ({ request }) => {
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
  http.get('*/rest/v1/thumbnails', ({ request }) => {
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
  http.get('*/rest/v1/terms', ({ request }) => {
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
  http.head('*/rest/v1/terms', ({ request }) => {
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

  // Authentication endpoints
  http.post('*/auth/v1/token*', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    // Accept any credentials that match the admin pattern for MSW
    if (body.email === 'admin@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        expires_in: 3600,
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
        user: {
          created_at: '2023-01-01T00:00:00.000Z',
          email: body.email,
          id: 'mock-user-id',
        },
      })
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 400 })
  }),

  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      created_at: '2023-01-01T00:00:00.000Z',
      email: 'admin@example.com',
      id: 'mock-user-id',
    })
  }),

  // Health check endpoint - simple SELECT query
  http.get('*/rest/v1/*', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    // For health checks or other simple queries, return empty success
    if (query.limit === '1') {
      return HttpResponse.json([])
    }

    return HttpResponse.json([])
  }),
]
