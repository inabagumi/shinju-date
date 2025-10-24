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
  {
    channel_id: 1,
    created_at: '2023-01-03T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT8M15S',
    id: 3,
    published_at: '2023-01-03T12:00:00.000Z',
    slug: 'sample-video-3',
    thumbnail_id: 1,
    title: 'Sample Video 3',
    updated_at: '2023-01-03T00:00:00.000Z',
    visible: false,
  },
  {
    channel_id: 2,
    created_at: '2023-01-04T00:00:00.000Z',
    deleted_at: null,
    duration: 'PT12M30S',
    id: 4,
    published_at: '2023-01-04T12:00:00.000Z',
    slug: 'sample-video-4',
    thumbnail_id: 2,
    title: 'Sample Video 4',
    updated_at: '2023-01-04T00:00:00.000Z',
    visible: false,
  },
  {
    channel_id: 1,
    created_at: '2023-01-05T00:00:00.000Z',
    deleted_at: '2023-01-10T00:00:00.000Z',
    duration: 'PT20M45S',
    id: 5,
    published_at: '2023-01-05T12:00:00.000Z',
    slug: 'deleted-video-1',
    thumbnail_id: 1,
    title: 'Deleted Video 1',
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
    slug: 'deleted-video-2',
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
  const eq = url.searchParams.get('eq')
  const in_ = url.searchParams.get('in')
  const is = url.searchParams.get('is')
  const not = url.searchParams.get('not')
  const limit = url.searchParams.get('limit')
  const offset = url.searchParams.get('offset')
  // Prefer header is preferred for count, but also check query param
  const prefer = url.searchParams.get('prefer') || ''
  const returnCount = prefer.includes('count=exact')

  return { eq, in_, is, not, limit, offset, select, returnCount }
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

  // Apply 'is' filter (e.g., deleted_at.is.null)
  if (query.is) {
    const fieldMatch = query.is.match(/^(\w+)\.is\.(.+)$/)
    if (fieldMatch) {
      const [, field, value] = fieldMatch
      if (field && value !== undefined) {
        if (value === 'null') {
          filteredData = filteredData.filter((item) => item[field] === null)
        }
      }
    }
  }

  // Apply 'not' filter (e.g., deleted_at.not.is.null)
  if (query.not) {
    const fieldMatch = query.not.match(/^(\w+)\.not\.is\.(.+)$/)
    if (fieldMatch) {
      const [, field, value] = fieldMatch
      if (field && value !== undefined) {
        if (value === 'null') {
          filteredData = filteredData.filter((item) => item[field] !== null)
        }
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
    const returnCount = preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockVideos, query)
    const count = filteredData.length
    
    // If this is a HEAD request or count only, return empty body with count header
    if (request.method === 'HEAD' || (returnCount && query.select === '*' && preferHeader.includes('head=true'))) {
      return new HttpResponse(null, { 
        headers: { 
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json'
        } 
      })
    }
    
    filteredData = applySelect(filteredData, query.select)
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(0, filteredData.length - 1)}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Channels table
  http.get('*/rest/v1/channels', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)
    
    const preferHeader = request.headers.get('prefer') || ''
    const returnCount = preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockChannels, query)
    const count = filteredData.length
    
    if (request.method === 'HEAD' || (returnCount && query.select === '*' && preferHeader.includes('head=true'))) {
      return new HttpResponse(null, { 
        headers: { 
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json'
        } 
      })
    }
    
    filteredData = applySelect(filteredData, query.select)
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(0, filteredData.length - 1)}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Thumbnails table
  http.get('*/rest/v1/thumbnails', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)
    
    const preferHeader = request.headers.get('prefer') || ''
    const returnCount = preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockThumbnails, query)
    const count = filteredData.length
    
    if (request.method === 'HEAD' || (returnCount && query.select === '*' && preferHeader.includes('head=true'))) {
      return new HttpResponse(null, { 
        headers: { 
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json'
        } 
      })
    }
    
    filteredData = applySelect(filteredData, query.select)
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(0, filteredData.length - 1)}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Terms table
  http.get('*/rest/v1/terms', ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)
    
    const preferHeader = request.headers.get('prefer') || ''
    const returnCount = preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(mockTerms, query)
    const count = filteredData.length
    
    if (request.method === 'HEAD' || (returnCount && query.select === '*' && preferHeader.includes('head=true'))) {
      return new HttpResponse(null, { 
        headers: { 
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json'
        } 
      })
    }
    
    filteredData = applySelect(filteredData, query.select)
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (returnCount) {
      headers['Content-Range'] = `0-${Math.max(0, filteredData.length - 1)}/${count}`
    }

    return HttpResponse.json(filteredData, { headers })
  }),

  // Authentication endpoints
  http.post('*/auth/v1/token*', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    // Accept any credentials that match the admin pattern for MSW
    if (body.email === 'admin@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        expires_in: 3600,
        token_type: 'bearer',
        user: {
          id: 'mock-user-id',
          email: body.email,
          created_at: '2023-01-01T00:00:00.000Z',
        }
      })
    }
    
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 400 })
  }),
  
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'admin@example.com',
      created_at: '2023-01-01T00:00:00.000Z',
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
