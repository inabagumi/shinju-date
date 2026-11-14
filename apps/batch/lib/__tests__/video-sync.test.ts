import { beforeEach, describe, expect, it, vi } from 'vitest'

const set = vi.fn()
const revalidateTags = vi.fn()

vi.mock('../redis', () => ({ redisClient: { set } }))
vi.mock('@shinju-date/web-cache', () => ({ revalidateTags }))

const { finishVideoSync } = await import('../video-sync')

const now = Temporal.Instant.from('2024-05-01T12:00:00.500Z')

describe('finishVideoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes the public cache when something changed', async () => {
    const { signal } = new AbortController()

    await finishVideoSync({ changed: true, now, signal })

    expect(revalidateTags).toHaveBeenCalledWith(['videos'], { signal })
  })

  it('leaves the public cache alone when nothing changed', async () => {
    await finishVideoSync({ changed: false, now })

    expect(revalidateTags).not.toHaveBeenCalled()
  })

  it('always records when videos were last synced', async () => {
    await finishVideoSync({ changed: false, now })

    expect(set).toHaveBeenCalledWith(
      'status:last_video_sync',
      '2024-05-01T12:00:00Z',
    )
  })
})
