import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findAllSuspenseChildren, runServerComponent } from '@/test/suspense'

const mocks = vi.hoisted(() => ({
  getTalents: vi.fn(),
  getVideos: vi.fn(),
}))

vi.mock('./_lib/get-videos', () => ({
  getVideos: mocks.getVideos,
}))
vi.mock('../talents/_lib/get-talents', () => ({
  getTalents: mocks.getTalents,
}))

const { default: VideosPage } = await import('./page')

/** ページの Suspense の中の部品を、すべて実行する */
async function renderPage(searchParams: Record<string, string>) {
  const children = findAllSuspenseChildren(
    VideosPage({
      params: Promise.resolve({}),
      searchParams: Promise.resolve(searchParams),
    }),
  )

  return Promise.all(children.map((child) => runServerComponent(child)))
}

describe('VideosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getTalents.mockResolvedValue([])
    mocks.getVideos.mockResolvedValue({ total: 45, videos: [] })
  })

  it('fetches the count and the table with the same cached call', async () => {
    await renderPage({ page: '2', search: 'test' })

    // `getVideos` is a `'use cache: private'` function, so the calls with the
    // same arguments share one entry and query the database once per request.
    const args = [2, 20, { search: 'test' }, 'updated_at', 'desc']
    expect(mocks.getVideos.mock.calls).toEqual([args, args])
  })

  it('renders the default list for an invalid page', async () => {
    await expect(renderPage({ page: 'abc' })).resolves.toHaveLength(3)

    const args = [1, 20, {}, 'updated_at', 'desc']
    expect(mocks.getVideos.mock.calls).toEqual([args, args])
  })
})
