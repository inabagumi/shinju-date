import type { ParsedUrlQuery } from 'node:querystring'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getVideosForPage } from './get-videos-for-page'

const mocks = vi.hoisted(() => ({
  getVideos: vi.fn(),
}))

vi.mock('./get-videos', () => ({
  getVideos: mocks.getVideos,
}))

describe('getVideosForPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getVideos.mockResolvedValue({ total: 45, videos: [] })
  })

  it('passes the validated parameters to getVideos', async () => {
    await expect(
      getVideosForPage(
        Promise.resolve({
          page: '2',
          search: 'test',
          sortField: 'published_at',
          sortOrder: 'asc',
          visible: 'true',
        }),
      ),
    ).resolves.toEqual({
      currentPage: 2,
      total: 45,
      totalPages: 3,
      videos: [],
    })

    expect(mocks.getVideos).toHaveBeenCalledExactlyOnceWith(
      2,
      20,
      { search: 'test', visible: [true] },
      'published_at',
      'asc',
    )
  })

  it('uses the default list for an invalid page', async () => {
    await expect(
      getVideosForPage(Promise.resolve({ page: 'abc' })),
    ).resolves.toMatchObject({ currentPage: 1 })

    expect(mocks.getVideos).toHaveBeenCalledExactlyOnceWith(
      1,
      20,
      {},
      'updated_at',
      'desc',
    )
  })

  it('uses the default list when the parameters fail validation', async () => {
    // Not a shape that a URL can produce, but the schema rejects it
    const searchParams = Promise.resolve({
      page: '3',
      search: { nested: 'value' },
    } as unknown as ParsedUrlQuery)

    await expect(getVideosForPage(searchParams)).resolves.toMatchObject({
      currentPage: 1,
    })

    expect(mocks.getVideos).toHaveBeenCalledExactlyOnceWith(
      1,
      20,
      {},
      'updated_at',
      'desc',
    )
  })
})
