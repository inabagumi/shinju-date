import { HttpResponse, http } from 'msw'
import {
  announcements,
  profileImages,
  seedCollections,
  talents,
  terms,
  thumbnails,
  videos,
  youtubeChannels,
  youtubeVideos,
} from '../collections.js'

/**
 * Mock data for Supabase tables using @msw/data
 *
 * Benefits of using @msw/data:
 * - Standard Schema-based (Zod) validation
 * - Built-in query methods (findMany, findFirst, create, update, delete)
 * - Type-safe operations with TypeScript
 * - Realistic data via faker integration
 * - Easy data manipulation and seeding
 */

// Initialize collections with seed data
await seedCollections()

/**
 * Helper functions to get fresh data from collections
 * These ensure we always query the latest state from @msw/data Collections
 */
async function getMockTalents() {
  return await talents.findMany()
}

async function getMockAnnouncements() {
  return await announcements.findMany()
}

async function getMockThumbnails() {
  return await thumbnails.findMany()
}

async function getMockVideos() {
  return await videos.findMany()
}

async function getMockChannels() {
  return await youtubeChannels.findMany()
}

async function getMockProfileImages() {
  return await profileImages.findMany()
}

async function getMockTerms() {
  return await terms.findMany()
}

async function getMockYoutubeVideos() {
  return await youtubeVideos.findMany()
}

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
  // biome-ignore lint/suspicious/noExplicitAny: Generic mock data handler requires any for flexible type matching across different table types
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

  // Apply offset before limit to match PostgREST pagination semantics
  if (query.offset) {
    const offsetNum = parseInt(query.offset, 10)
    filteredData = filteredData.slice(offsetNum)
  }

  // Apply limit
  if (query.limit) {
    const limitNum = parseInt(query.limit, 10)
    filteredData = filteredData.slice(0, limitNum)
  }

  return filteredData
}

/**
 * A single entry of a PostgREST `select` parameter.
 *
 * - `column`: a plain column such as `id` or an aliased one such as `name:title`
 * - `relation`: an embedded resource such as `talent:talents!inner(id,name)`
 * - `wildcard`: `*`
 */
type SelectNode =
  | { kind: 'column'; alias: string; column: string }
  | { kind: 'relation'; alias: string; fields: SelectNode[]; relation: string }
  | { kind: 'wildcard' }

/**
 * Split a select string on commas that are not nested inside parentheses.
 *
 * `thumbnail:thumbnails(id,path),talent:talents(id,name)` becomes
 * `['thumbnail:thumbnails(id,path)', 'talent:talents(id,name)']`.
 */
function splitSelectFields(selectStr: string): string[] {
  const fields: string[] = []
  let depth = 0
  let current = ''

  for (const char of selectStr) {
    if (char === '(') {
      depth += 1
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    }

    if (char === ',' && depth === 0) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }
  fields.push(current)

  return fields.map((field) => field.trim()).filter((field) => field !== '')
}

/**
 * Parse a PostgREST `select` parameter into a tree of select nodes.
 */
function parseSelect(selectStr: string): SelectNode[] {
  return splitSelectFields(selectStr).map((field): SelectNode => {
    if (field === '*') {
      return { kind: 'wildcard' }
    }

    // alias:relation!hint(fields) where alias and hint are optional
    const relationMatch = field.match(
      /^(?:(\w+):)?(\w+)(?:!\w+)*\s*\(([\s\S]*)\)$/,
    )
    if (relationMatch) {
      const [, alias, relation = '', nestedFields = ''] = relationMatch
      return {
        alias: alias ?? relation,
        fields: parseSelect(nestedFields),
        kind: 'relation',
        relation,
      }
    }

    // alias:column::cast where alias and cast are optional
    const columnMatch = field.match(/^(?:(\w+):)?(\w+)(?:::\w+)?$/)
    const [, alias, column = field] = columnMatch ?? []
    return { alias: alias ?? column, column, kind: 'column' }
  })
}

/**
 * Resolve an embedded resource for a row.
 *
 * Relations are resolved manually via Collection queries because
 * @msw/data's automatic relation system would require relations to be
 * declared in every schema.
 */
async function resolveRelation(
  relation: string,
  // biome-ignore lint/suspicious/noExplicitAny: Rows can come from any table
  item: any,
  // biome-ignore lint/suspicious/noExplicitAny: Rows can come from any table
): Promise<any> {
  switch (relation) {
    case 'talents':
      return item.talent_id
        ? await talents.findFirst((q) => q.where({ id: item.talent_id }))
        : null
    case 'thumbnails':
      return item.thumbnail_id
        ? await thumbnails.findFirst((q) => q.where({ id: item.thumbnail_id }))
        : null
    case 'videos':
      return item.video_id
        ? await videos.findFirst((q) => q.where({ id: item.video_id }))
        : null
    case 'youtube_videos':
      // One-to-one with videos
      return item.id
        ? await youtubeVideos.findFirst((q) => q.where({ video_id: item.id }))
        : null
    case 'youtube_channels':
      // One-to-many with talents
      return item.id
        ? await youtubeChannels.findMany((q) => q.where({ talent_id: item.id }))
        : []
    case 'profile_images':
      // One-to-one with youtube_channels / twitch_users
      if ('youtube_handle' in item) {
        return await profileImages.findFirst((q) =>
          q.where({ youtube_channel_id: item.id }),
        )
      }

      if ('twitch_login_name' in item) {
        return await profileImages.findFirst((q) =>
          q.where({ twitch_user_id: item.id }),
        )
      }

      return null
    case 'twitch_users':
      // No Twitch mock data yet. Embedding from talents is one-to-many
      // (empty array), while embedding from twitch_videos is many-to-one.
      return 'talent_id' in item ? null : []
    default:
      // Relations without mock data (e.g. twitch_videos, twitch_users)
      return null
  }
}

/**
 * Project a single row according to parsed select nodes, resolving
 * embedded resources recursively.
 */
async function projectRow(
  // biome-ignore lint/suspicious/noExplicitAny: Rows can come from any table
  item: any,
  nodes: SelectNode[],
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic object construction from select fields
): Promise<any> {
  // biome-ignore lint/suspicious/noExplicitAny: Dynamic object construction from select fields
  const result: any = {}

  for (const node of nodes) {
    if (node.kind === 'wildcard') {
      Object.assign(result, item)
    } else if (node.kind === 'column') {
      if (node.column in item) {
        result[node.alias] = item[node.column]
      }
    } else {
      const related = await resolveRelation(node.relation, item)

      if (Array.isArray(related)) {
        result[node.alias] = await Promise.all(
          related.map((relatedItem) => projectRow(relatedItem, node.fields)),
        )
      } else if (related) {
        result[node.alias] = await projectRow(related, node.fields)
      } else {
        result[node.alias] = null
      }
    }
  }

  return result
}

/**
 * Handle Supabase select projection, including nested embedded resources
 * such as `talent:talents(id,name)` or
 * `twitch_video:twitch_videos(type,twitch_user:twitch_users(twitch_login_name))`.
 */
async function applySelect(
  // biome-ignore lint/suspicious/noExplicitAny: Generic mock data handler requires any for flexible type matching across different table types
  data: any[],
  selectStr: string,
) {
  if (selectStr === '*') {
    return data
  }

  const nodes = parseSelect(selectStr)

  return await Promise.all(data.map((item) => projectRow(item, nodes)))
}

export const supabaseHandlers = [
  // Videos table
  http.get('https://fake.supabase.test/rest/v1/videos', async ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    // Check if count is requested via Prefer header
    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(await getMockVideos(), query)
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

    filteredData = await applySelect(filteredData, query.select)

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
  http.head(
    'https://fake.supabase.test/rest/v1/videos',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(await getMockVideos(), query)
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // Videos PATCH (update)
  http.patch(
    'https://fake.supabase.test/rest/v1/videos',
    async ({ request }) => {
      const url = new URL(request.url)
      const preferHeader = request.headers.get('prefer') || ''
      const query = parseSupabaseQuery(url)
      // biome-ignore lint/suspicious/noExplicitAny: Request body can contain various table update payloads
      const body = (await request.json()) as any

      // Find matching records and update them using @msw/data Collections
      // biome-ignore lint/suspicious/noExplicitAny: Updated items can be from any table type
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

          // Find and update records in Collection
          const matches = await videos.findMany((q) =>
            q.where({ [field]: parsedValue }),
          )

          for (const match of matches) {
            await videos.update((q) => q.where({ id: match.id }), {
              data(record) {
                return Object.assign(record, body)
              },
            })
            updatedItems.push({ ...match, ...body })
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

  // Channels table
  http.get(
    'https://fake.supabase.test/rest/v1/channels',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const preferHeader = request.headers.get('prefer') || ''
      const returnCount =
        preferHeader.includes('count=exact') || query.returnCount

      let filteredData = applySupabaseFilters(await getMockChannels(), query)
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

      filteredData = await applySelect(filteredData, query.select)

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
    },
  ),

  // Channels table HEAD requests
  http.head(
    'https://fake.supabase.test/rest/v1/channels',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(await getMockChannels(), query)
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // Thumbnails table
  http.get(
    'https://fake.supabase.test/rest/v1/thumbnails',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const preferHeader = request.headers.get('prefer') || ''
      const returnCount =
        preferHeader.includes('count=exact') || query.returnCount

      let filteredData = applySupabaseFilters(await getMockThumbnails(), query)
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

      filteredData = await applySelect(filteredData, query.select)

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
    },
  ),

  // Profile images table
  http.get(
    'https://fake.supabase.test/rest/v1/profile_images',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      let filteredData = applySupabaseFilters(
        await getMockProfileImages(),
        query,
      )
      filteredData = await applySelect(filteredData, query.select)

      // maybeSingle()/single() ask for an object instead of an array
      const accept = request.headers.get('accept') || ''
      if (accept.includes('application/vnd.pgrst.object+json')) {
        const [row] = filteredData

        if (!row) {
          return HttpResponse.json(
            {
              code: 'PGRST116',
              details: 'The result contains 0 rows',
              hint: null,
              message: 'Cannot coerce the result to a single JSON object',
            },
            { status: 406 },
          )
        }

        return HttpResponse.json(row)
      }

      return HttpResponse.json(filteredData)
    },
  ),

  // Terms table
  http.get('https://fake.supabase.test/rest/v1/terms', async ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const preferHeader = request.headers.get('prefer') || ''
    const returnCount =
      preferHeader.includes('count=exact') || query.returnCount

    let filteredData = applySupabaseFilters(await getMockTerms(), query)
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

    filteredData = await applySelect(filteredData, query.select)

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
  http.head('https://fake.supabase.test/rest/v1/terms', async ({ request }) => {
    const url = new URL(request.url)
    const query = parseSupabaseQuery(url)

    const filteredData = applySupabaseFilters(await getMockTerms(), query)
    const count = filteredData.length

    return new HttpResponse(null, {
      headers: {
        'Content-Range': `0-0/${count}`,
        'Content-Type': 'application/json',
      },
    })
  }),

  // Talents table
  http.get(
    'https://fake.supabase.test/rest/v1/talents',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const preferHeader = request.headers.get('prefer') || ''
      const returnCount =
        preferHeader.includes('count=exact') || query.returnCount

      let filteredData = applySupabaseFilters(await getMockTalents(), query)
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

      filteredData = await applySelect(filteredData, query.select)

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
    },
  ),

  // Talents table HEAD requests
  http.head(
    'https://fake.supabase.test/rest/v1/talents',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(await getMockTalents(), query)
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // Announcements table GET requests
  http.get(
    'https://fake.supabase.test/rest/v1/announcements',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const preferHeader = request.headers.get('prefer') || ''
      const returnCount =
        preferHeader.includes('count=exact') || query.returnCount

      let filteredData = applySupabaseFilters(
        await getMockAnnouncements(),
        query,
      )
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

      filteredData = await applySelect(filteredData, query.select)

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
    },
  ),

  // Announcements table HEAD requests
  http.head(
    'https://fake.supabase.test/rest/v1/announcements',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(
        await getMockAnnouncements(),
        query,
      )
      const count = filteredData.length

      return new HttpResponse(null, {
        headers: {
          'Content-Range': `0-0/${count}`,
          'Content-Type': 'application/json',
        },
      })
    },
  ),

  // YouTube Channels Table
  http.get(
    'https://fake.supabase.test/rest/v1/youtube_channels',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      let filteredData = applySupabaseFilters(await getMockChannels(), query)
      filteredData = await applySelect(filteredData, query.select)

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
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(await getMockChannels(), query)
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
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      // Get fresh data from collection
      const mockYoutubeVideos = await getMockYoutubeVideos()

      let filteredData = applySupabaseFilters(mockYoutubeVideos, query)
      filteredData = await applySelect(filteredData, query.select)

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
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      const filteredData = applySupabaseFilters(
        await getMockYoutubeVideos(),
        query,
      )
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
      // biome-ignore lint/suspicious/noExplicitAny: Request body can contain various table insert payloads
      const body = (await request.json()) as any

      // Handle both single object and array of objects
      const items = Array.isArray(body) ? body : [body]

      // Mock upsert behavior using @msw/data Collections: update existing or add new
      // biome-ignore lint/suspicious/noExplicitAny: Created items can be from any table type
      const createdItems: any[] = []
      for (const item of items) {
        const existing = await youtubeVideos.findFirst((q) =>
          q.where({ video_id: item.video_id }),
        )

        if (existing) {
          // Update existing using Collection.update
          await youtubeVideos.update(
            (q) => q.where({ video_id: item.video_id }),
            {
              data(record) {
                return Object.assign(record, item)
              },
            },
          )
          createdItems.push({ ...existing, ...item })
        } else {
          // Insert new using Collection.create
          const created = await youtubeVideos.create(item)
          createdItems.push(created)
        }
      }

      // Return the inserted/updated items if representation is requested
      if (preferHeader.includes('return=representation')) {
        return HttpResponse.json(createdItems, {
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
      // biome-ignore lint/suspicious/noExplicitAny: Request body can contain various table update payloads
      const body = (await request.json()) as any

      // Find matching records and update them using @msw/data Collections
      // biome-ignore lint/suspicious/noExplicitAny: Updated items can be from any table type
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

          // Find and update records in Collection
          const matches = await youtubeVideos.findMany((q) =>
            q.where({ [field]: parsedValue }),
          )

          for (const match of matches) {
            await youtubeVideos.update((q) => q.where({ id: match.id }), {
              data(record) {
                return Object.assign(record, body)
              },
            })
            updatedItems.push({ ...match, ...body })
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

  // Talents PATCH (update)
  http.patch(
    'https://fake.supabase.test/rest/v1/talents',
    async ({ request }) => {
      const url = new URL(request.url)
      const preferHeader = request.headers.get('prefer') || ''
      const query = parseSupabaseQuery(url)
      // biome-ignore lint/suspicious/noExplicitAny: Request body can contain various table update payloads
      const body = (await request.json()) as any

      // Find matching records and update them using @msw/data Collections
      // biome-ignore lint/suspicious/noExplicitAny: Updated items can be from any table type
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

          // Find and update records in Collection
          const matches = await talents.findMany((q) =>
            q.where({ [field]: parsedValue }),
          )

          for (const match of matches) {
            await talents.update((q) => q.where({ id: match.id }), {
              data(record) {
                return Object.assign(record, body)
              },
            })
            updatedItems.push({ ...match, ...body })
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

  // YouTube Channels DELETE
  http.delete(
    'https://fake.supabase.test/rest/v1/youtube_channels',
    async ({ request }) => {
      const url = new URL(request.url)
      const query = parseSupabaseQuery(url)

      // Find matching records and delete them using @msw/data Collections
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

          // Find and delete records in Collection
          const matches = await youtubeChannels.findMany((q) =>
            q.where({ [field]: parsedValue }),
          )

          for (const match of matches) {
            await youtubeChannels.delete((q) => q.where({ id: match.id }))
            // ON DELETE CASCADE
            await profileImages.delete((q) =>
              q.where({ youtube_channel_id: match.id }),
            )
          }
        }
      }

      return new HttpResponse(null, { status: 204 })
    },
  ),

  // Authentication endpoints
  http.get(
    'https://fake.supabase.test/auth/v1/user',
    async ({ request, cookies }) => {
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
  http.get(
    'https://fake.supabase.test/auth/v1/session',
    async ({ request }) => {
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
    },
  ),

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
  http.get('https://fake.supabase.test/rest/v1/*', async ({ request }) => {
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
      const mockVideos = await getMockVideos()
      const mockTalents = await getMockTalents()
      const mockThumbnails = await getMockThumbnails()
      const mockYoutubeVideos = await getMockYoutubeVideos()

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
            deleted_at: video.deleted_at,
            duration: video.duration,
            id: video.id,
            platform: video.platform,
            published_at: video.published_at,
            status: video.status,
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
            twitch_video: null,
            updated_at: video.updated_at,
            video_kind: video.video_kind,
            visible: video.visible,
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
  // Use :path* to match any nested path structure
  http.post(
    'https://fake.supabase.test/storage/v1/object/sign/:bucket/:path*',
    async ({ request, params }) => {
      const url = new URL(request.url)
      // Log the full URL for debugging
      console.log('[MSW Storage] createSignedUrl called with URL:', url.href)

      // Extract path from params (handles nested paths correctly)
      // :path* returns an array when there are multiple segments
      const bucket = String(params['bucket'])
      const pathParam = params['path']
      const path = Array.isArray(pathParam) ? pathParam.join('/') : pathParam

      console.log('[MSW Storage] Extracted path:', bucket, path)

      // Don't add the bucket prefix again - the path parameter from the SDK
      // is relative to the bucket, so it's just "video1.jpg" not "/thumbnails/video1.jpg"
      const signedUrl = `https://fake.supabase.test/storage/v1/object/public/${bucket}/${path}`
      console.log('[MSW Storage] Returning signedURL:', signedUrl)

      // Return a mock signed URL
      // The Supabase storage-js expects { signedURL } from the API
      return HttpResponse.json({
        signedURL: signedUrl,
      })
    },
  ),

  // Handle all stored image fetches with a flexible pattern
  // Use :path* to match any path including nested directories
  http.get(
    'https://fake.supabase.test/storage/v1/object/public/:bucket/:path*',
    async ({ params, request }) => {
      console.log('[MSW Storage] GET image called:', request.url)
      // Profile images are square; thumbnails are 16:9.
      const [width, height] =
        params['bucket'] === 'profile-images' ? [256, 256] : [1280, 720]
      const dummyImage = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" />`

      return new HttpResponse(dummyImage, {
        headers: {
          'Accept-Ranges': 'none',
          'Content-Type': 'image/svg+xml',
        },
      })
    },
  ),

  // Removing objects (e.g. profile images of deleted accounts)
  http.delete(
    'https://fake.supabase.test/storage/v1/object/:bucket',
    async ({ request }) => {
      const { prefixes = [] } = (await request.json()) as {
        prefixes?: string[]
      }

      return HttpResponse.json(prefixes.map((name) => ({ name })))
    },
  ),
]
