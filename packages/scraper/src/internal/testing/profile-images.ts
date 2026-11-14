import { HttpResponse, http } from 'msw'
import sharp from 'sharp'
import type { setupSupabase } from './supabase.js'

type MockSupabase = ReturnType<typeof setupSupabase>

const STORAGE_URL =
  'https://fake.supabase.test/storage/v1/object/profile-images'

/** Creates a solid-colour JPEG of the given size. */
export function createImage(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      background: { b: 0, g: 0, r: 255 },
      channels: 3,
      height,
      width,
    },
  })
    .jpeg()
    .toBuffer()
}

export interface ServedImage {
  body: Buffer
  /** Whether the CDN answers conditional requests with 304 (default: true). */
  conditional?: boolean
  contentType?: string
  etag?: string | null
}

export interface ImageRequest {
  ifNoneMatch: string | null
  url: string
}

/**
 * Serves an image from the platform CDN. A request whose If-None-Match
 * matches the image's ETag gets `304 Not Modified`.
 */
export function serveImage(
  supabase: MockSupabase,
  url: string,
  {
    body,
    conditional = true,
    contentType = 'image/jpeg',
    etag = '"etag-1"',
  }: ServedImage,
): ImageRequest[] {
  const requests: ImageRequest[] = []

  supabase.server.use(
    http.get(url, ({ request }) => {
      const ifNoneMatch = request.headers.get('If-None-Match')
      const headers: Record<string, string> = { 'Content-Type': contentType }

      requests.push({ ifNoneMatch, url: request.url })

      if (etag) {
        headers['ETag'] = etag

        if (conditional && ifNoneMatch === etag) {
          return new HttpResponse(null, { headers, status: 304 })
        }
      }

      return HttpResponse.arrayBuffer(new Uint8Array(body).buffer, {
        headers,
      })
    }),
  )

  return requests
}

export interface StorageCalls {
  /** Paths passed to `remove`, one array per call. */
  removed: string[][]
  /** Uploaded objects, by path within the bucket. */
  uploads: { body: Buffer; contentType: string | null; path: string }[]
}

/** Records uploads to and removals from the profile-images bucket. */
export function mockStorage(supabase: MockSupabase): StorageCalls {
  const calls: StorageCalls = { removed: [], uploads: [] }

  supabase.server.use(
    http.post(`${STORAGE_URL}/*`, async ({ request }) => {
      const path = new URL(request.url).pathname.replace(
        '/storage/v1/object/profile-images/',
        '',
      )

      calls.uploads.push({
        body: Buffer.from(await request.arrayBuffer()),
        contentType: request.headers.get('Content-Type'),
        path,
      })

      return HttpResponse.json({ Key: `profile-images/${path}` })
    }),
    http.delete(STORAGE_URL, async ({ request }) => {
      const { prefixes } = (await request.json()) as { prefixes: string[] }

      calls.removed.push(prefixes)

      return HttpResponse.json([])
    }),
  )

  return calls
}
