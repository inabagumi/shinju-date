import { HttpResponse, http } from 'msw'

// Mock data for Supabase tables
const mockChannels = [
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 1,
    name: 'Test Channel Alpha',
    slug: 'test-channel-alpha',
    updated_at: '2023-01-01T00:00:00.000Z',
  },
  {
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    id: 2,
    name: 'Sample Channel Beta',
    slug: 'sample-channel-beta',
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
]

const mockVideos = [
  {
    channel_id: 1,
    created_at: '2023-01-01T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT10M30S',
    id: 1,
    published_at: '2023-01-01T12:00:00.000Z',
    slug: 'sample-video-1',
    thumbnail_id: 1,
    title: 'Sample Video 1',
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
    slug: 'sample-video-2',
    thumbnail_id: 2,
    title: 'Sample Video 2',
    updated_at: '2023-01-02T00:00:00.000Z',
    visible: true,
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
]

/**
 * Parse Supabase REST API query parameters
 */
function parseSupabaseQuery(url: URL) {
  const select = url.searchParams.get('select') || '*'
  const eq = url.searchParams.get('eq')
  const in_ = url.searchParams.get('in')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')

  return { eq, in_, limit, offset, select }
}

/**
 * Apply filters and selections to mock data
 */
function applySupabaseFilters(
  data: any[],
  query: ReturnType<typeof parseSupabaseQuery>,
) {
  let filteredData = [...data]

  // Apply 'in' filter (e.g., id.in.(1,2,3))
  if (query.in_) {
    const fieldMatch = query.in_.match(/^(\w+)\.in\.\(([^)]+)\)$/)
    if (fieldMatch) {
      const [, field, values] = fieldMatch
      if (field && values) {
        const valueArray = values.split(',').map((v) => {
          const trimmed = v.trim()
          return Number.isNaN(Number(trimmed)) ? trimmed : Number(trimmed)
        })
        filteredData = filteredData.filter((item) =>
          valueArray.includes(item[field]),
        )
      }
    }
  }

  // Apply 'eq' filter
  if (query.eq) {
    const fieldMatch = query.eq.match(/^(\w+)\.eq\.(.+)$/)
    if (fieldMatch) {
      const [, field, value] = fieldMatch
      if (field && value !== undefined) {
        const parsedValue = Number.isNaN(Number(value)) ? value : Number(value)
        filteredData = filteredData.filter(
          (item) => item[field] === parsedValue,
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

    let filteredData = applySupabaseFilters(mockVideos, query)
    filteredData = applySelect(filteredData, query.select)

    return HttpResponse.json(filteredData)
  }),

  // Channels table
  http.get('*/rest/v1/channels', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    let filteredData = applySupabaseFilters(mockChannels, query)
    filteredData = applySelect(filteredData, query.select)

    return HttpResponse.json(filteredData)
  }),

  // Thumbnails table
  http.get('*/rest/v1/thumbnails', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    let filteredData = applySupabaseFilters(mockThumbnails, query)
    filteredData = applySelect(filteredData, query.select)

    return HttpResponse.json(filteredData)
  }),

  // Terms table
  http.get('*/rest/v1/terms', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    let filteredData = applySupabaseFilters(mockTerms, query)
    filteredData = applySelect(filteredData, query.select)

    return HttpResponse.json(filteredData)
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
