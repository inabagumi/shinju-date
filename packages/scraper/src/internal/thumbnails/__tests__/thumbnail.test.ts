import { HttpResponse, http } from 'msw'
import sharp from 'sharp'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import { createThumbnail, removeThumbnail } from '../thumbnail.js'

const supabase = setupSupabase()

const IMAGE_URL = 'https://images.test/thumbnail.jpg'
const STORAGE_URL = 'https://fake.supabase.test/storage/v1/object/thumbnails/*'
const now = Temporal.Instant.from('2024-05-01T12:34:56.789Z')
const source = { height: 720, url: IMAGE_URL, width: 1280 }

let image: Buffer

beforeAll(async () => {
  image = await sharp({
    create: {
      background: { b: 0, g: 0, r: 255 },
      channels: 3,
      height: 18,
      width: 32,
    },
  })
    .jpeg()
    .toBuffer()
})

interface MockOptions {
  contentType?: string
  uploads?: string[]
}

function mockImageAndStorage({
  contentType = 'image/jpeg',
  uploads = [],
}: MockOptions = {}): string[] {
  supabase.server.use(
    http.get(IMAGE_URL, () =>
      HttpResponse.arrayBuffer(new Uint8Array(image).buffer, {
        headers: { 'Content-Type': contentType, ETag: '"etag-1"' },
      }),
    ),
    http.post(STORAGE_URL, ({ request }) => {
      uploads.push(new URL(request.url).pathname)

      return HttpResponse.json({ Key: 'thumbnails/x' })
    }),
  )

  return uploads
}

describe('createThumbnail', () => {
  it('stores the image and registers it', async () => {
    const uploads = mockImageAndStorage()
    supabase.respond(() => [])

    const thumbnail = await createThumbnail({
      folder: 'yt-1',
      now,
      source,
      supabaseClient: supabase.supabaseClient,
    })

    expect(thumbnail.path).toMatch(/^yt-1\/[\w-]+\.jpe?g$/)
    expect(uploads).toEqual([`/storage/v1/object/thumbnails/${thumbnail.path}`])
    expect(supabase.written('POST', 'thumbnails')[0]?.body).toEqual({
      blur_data_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
      etag: '"etag-1"',
      height: 720,
      id: thumbnail.id,
      path: thumbnail.path,
      updated_at: '2024-05-01T12:34:56Z',
      width: 1280,
    })
  })

  it('rejects responses that are not images without storing anything', async () => {
    const uploads = mockImageAndStorage({ contentType: 'text/html' })
    supabase.respond(() => [])

    await expect(
      createThumbnail({
        folder: 'yt-1',
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('Expected an image')
    expect(uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('rejects error responses without storing anything', async () => {
    const uploads = mockImageAndStorage()
    supabase.server.use(
      http.get(IMAGE_URL, () => new HttpResponse('Not Found', { status: 404 })),
    )
    supabase.respond(() => [])

    await expect(
      createThumbnail({
        folder: 'yt-1',
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('Failed to download a thumbnail (404)')
    expect(uploads).toHaveLength(0)
    expect(supabase.requests).toHaveLength(0)
  })

  it('removes the stored image when it cannot be registered', async () => {
    const removed: unknown[] = []
    mockImageAndStorage()
    supabase.server.use(
      http.delete(
        'https://fake.supabase.test/storage/v1/object/thumbnails',
        async ({ request }) => {
          removed.push(await request.json())

          return HttpResponse.json([])
        },
      ),
    )
    supabase.respond(() => postgresError('23502', 'null value in column'))

    await expect(
      createThumbnail({
        folder: 'yt-1',
        now,
        source,
        supabaseClient: supabase.supabaseClient,
      }),
    ).rejects.toThrow('null value in column')
    expect(removed).toEqual([{ prefixes: [expect.stringMatching(/^yt-1\//)] }])
  })
})

describe('removeThumbnail', () => {
  const STORAGE_DELETE_URL =
    'https://fake.supabase.test/storage/v1/object/thumbnails'
  const thumbnail = { id: 'thumb-1', path: 'yt-1/abc.jpg' }

  function mockStorageRemoval(
    respond: () => Response = () => HttpResponse.json([]),
  ): unknown[] {
    const removed: unknown[] = []
    supabase.server.use(
      http.delete(STORAGE_DELETE_URL, async ({ request }) => {
        removed.push(await request.json())

        return respond()
      }),
    )

    return removed
  }

  it('removes the row and the stored image', async () => {
    const reportError = vi.fn()
    const removed = mockStorageRemoval()
    supabase.respond(() => [])

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail,
    )

    expect(supabase.written('DELETE', 'thumbnails')[0]?.query['id']).toBe(
      'eq.thumb-1',
    )
    expect(removed).toEqual([{ prefixes: ['yt-1/abc.jpg'] }])
    expect(reportError).not.toHaveBeenCalled()
  })

  it('reports a row that cannot be deleted and keeps its image', async () => {
    const reportError = vi.fn()
    const removed = mockStorageRemoval()
    supabase.respond(() => postgresError('23503', 'foreign key violation'))

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail,
    )

    expect(removed).toHaveLength(0)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('foreign key violation'),
      }),
      { thumbnailId: 'thumb-1', thumbnailPath: 'yt-1/abc.jpg' },
    )
  })

  it('reports an image that cannot be removed', async () => {
    const reportError = vi.fn()
    mockStorageRemoval(() =>
      HttpResponse.json(
        { error: 'Internal', message: 'storage is down', statusCode: '500' },
        { status: 500 },
      ),
    )
    supabase.respond(() => [])

    await removeThumbnail(
      { reportError, supabaseClient: supabase.supabaseClient },
      thumbnail,
    )

    expect(supabase.written('DELETE', 'thumbnails')).toHaveLength(1)
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'storage is down' }),
      { thumbnailId: 'thumb-1', thumbnailPath: 'yt-1/abc.jpg' },
    )
  })
})
