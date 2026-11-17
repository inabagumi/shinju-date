import { HttpResponse, http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { createTestContext } from '../../testing/context.js'
import { postgresError, setupSupabase } from '../../testing/supabase.js'
import { replaceThumbnail } from '../replace.js'

const supabase = setupSupabase()

const STORAGE_DELETE_URL =
  'https://fake.supabase.test/storage/v1/object/thumbnails'
const created = { id: 'thumb-new', path: 'vod-1/new.jpg' }

function setup() {
  const reportError = vi.fn()
  const removedPaths: unknown[] = []
  supabase.server.use(
    http.delete(STORAGE_DELETE_URL, async ({ request }) => {
      removedPaths.push(await request.json())

      return HttpResponse.json([])
    }),
  )

  return {
    context: createTestContext({
      fetcher: null,
      reportError,
      supabaseClient: supabase.supabaseClient,
    }),
    removedPaths,
    reportError,
  }
}

function deletedThumbnailIds(): (string | undefined)[] {
  return supabase
    .written('DELETE', 'thumbnails')
    .map((request) => request.query['id'])
}

describe('replaceThumbnail', () => {
  it('points the video at the new thumbnail and leaves the previous one for the cleanup', async () => {
    const { context, removedPaths, reportError } = setup()
    supabase.respond(() => [])

    const thumbnail = await replaceThumbnail(context, {
      create: async () => created,
      fields: { title: 'Archive' },
      videoId: 'video-1',
    })

    expect(thumbnail).toEqual(created)

    const [update] = supabase.written('PATCH', 'videos')

    expect(update?.query['id']).toBe('eq.video-1')
    expect(update?.body).toEqual({
      thumbnail_id: 'thumb-new',
      title: 'Archive',
      updated_at: '2024-05-01T12:00:00Z',
    })
    expect(deletedThumbnailIds()).toEqual([])
    expect(removedPaths).toEqual([])
    expect(reportError).not.toHaveBeenCalled()
  })

  it('updates only the other columns when no new thumbnail is stored', async () => {
    const { context } = setup()
    supabase.respond(() => [])

    const thumbnail = await replaceThumbnail(context, {
      create: async () => null,
      fields: { title: 'Archive' },
      videoId: 'video-1',
    })

    expect(thumbnail).toBeNull()
    expect(supabase.written('PATCH', 'videos')[0]?.body).toEqual({
      title: 'Archive',
      updated_at: '2024-05-01T12:00:00Z',
    })
  })

  it('writes nothing when no new thumbnail is stored and nothing else changed', async () => {
    const { context } = setup()
    supabase.respond(() => [])

    await replaceThumbnail(context, {
      create: async () => null,
      fields: {},
      videoId: 'video-1',
    })

    expect(supabase.requests).toEqual([])
  })

  it('removes the new thumbnail when the video cannot be updated', async () => {
    const { context, removedPaths } = setup()
    supabase.respond(({ table }) =>
      table === 'videos' ? postgresError('57014', 'statement timeout') : [],
    )

    await expect(
      replaceThumbnail(context, {
        create: async () => created,
        fields: { title: 'Archive' },
        videoId: 'video-1',
      }),
    ).rejects.toThrow('statement timeout')
    expect(deletedThumbnailIds()).toEqual(['eq.thumb-new'])
    expect(removedPaths).toEqual([{ prefixes: ['vod-1/new.jpg'] }])
  })

  it('still throws the update failure when the new thumbnail cannot be removed', async () => {
    const { context, removedPaths, reportError } = setup()
    supabase.respond(({ table }) =>
      postgresError('57014', `statement timeout on ${table}`),
    )

    await expect(
      replaceThumbnail(context, {
        create: async () => created,
        fields: {},
        videoId: 'video-1',
      }),
    ).rejects.toThrow('statement timeout on videos')
    expect(removedPaths).toEqual([])
    expect(reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('statement timeout on thumbnails'),
      }),
      { thumbnailId: 'thumb-new', thumbnailPath: 'vod-1/new.jpg' },
    )
  })
})
