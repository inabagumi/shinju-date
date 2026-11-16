import { CACHE_TAGS, type CacheTag } from '@shinju-date/constants'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest'
import { revalidateTags } from '../index.js'

vi.mock('@shinju-date/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}))

describe('revalidateTags', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubEnv('REVALIDATE_URL', 'https://shinju.date/api/revalidate')
    vi.stubEnv('REVALIDATE_SECRET_TOKEN', 'secret')
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('accepts only the tags in CACHE_TAGS', () => {
    expectTypeOf(revalidateTags).parameter(0).toEqualTypeOf<CacheTag[]>()

    // @ts-expect-error A tag that is not in CACHE_TAGS is a type error.
    void revalidateTags(['video'])
  })

  it('sends the tags to the revalidation endpoint', async () => {
    await revalidateTags([CACHE_TAGS.TALENTS, CACHE_TAGS.VIDEOS])

    expect(fetchMock).toHaveBeenCalledWith(
      'https://shinju.date/api/revalidate',
      expect.objectContaining({
        body: JSON.stringify({ tags: ['talents', 'videos'] }),
        headers: {
          Authorization: 'Bearer secret',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }),
    )
  })

  it('does nothing without tags', async () => {
    await revalidateTags([])

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
