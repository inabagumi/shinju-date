import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, { count: number; ttl: number | null }>()

function multi() {
  const commands: (() => number)[] = []
  const transaction = {
    exec: async () => commands.map((command) => command()),
    expire(key: string, seconds: number) {
      commands.push(() => {
        const entry = store.get(key)
        if (!entry) return 0
        entry.ttl = seconds
        return 1
      })
      return transaction
    },
    incr(key: string) {
      commands.push(() => {
        const entry = store.get(key) ?? { count: 0, ttl: null }
        entry.count += 1
        store.set(key, entry)
        return entry.count
      })
      return transaction
    },
  }
  return transaction
}

vi.mock('../redis', () => ({ redisClient: { multi } }))

const { limitOncePerWindow, statsSnapshot, videosCheck } = await import(
  '../ratelimit'
)

function setNow(isoString: string) {
  vi.spyOn(Temporal.Now, 'instant').mockReturnValue(
    Temporal.Instant.from(isoString),
  )
}

describe('limitOncePerWindow', () => {
  beforeEach(() => {
    store.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts the first run in a window', async () => {
    setNow('2024-05-01T12:00:00Z')

    await expect(limitOncePerWindow('videos:check', 30)).resolves.toEqual({
      success: true,
    })
  })

  it('rejects the second run in the same window', async () => {
    setNow('2024-05-01T12:00:00Z')
    await limitOncePerWindow('videos:check', 30)

    setNow('2024-05-01T12:00:29.999Z')

    await expect(limitOncePerWindow('videos:check', 30)).resolves.toEqual({
      success: false,
    })
  })

  it('accepts a run in the next window, however soon it comes', async () => {
    setNow('2024-05-01T12:00:29.999Z')
    await limitOncePerWindow('videos:check', 30)

    setNow('2024-05-01T12:00:30Z')

    await expect(limitOncePerWindow('videos:check', 30)).resolves.toEqual({
      success: true,
    })
  })

  it('counts each identifier separately', async () => {
    setNow('2024-05-01T12:00:00Z')
    await limitOncePerWindow('videos:check:youtube', 30)

    await expect(
      limitOncePerWindow('videos:check:twitch', 30),
    ).resolves.toEqual({ success: true })
  })

  it('keys the count by the identifier and the window number', async () => {
    setNow('2024-05-01T12:00:00Z')

    await limitOncePerWindow('videos:check', 30)

    const window = Math.floor(
      Temporal.Instant.from('2024-05-01T12:00:00Z').epochMilliseconds / 30_000,
    )
    expect([...store.keys()]).toEqual([`ratelimit:cron:videos:check:${window}`])
  })

  it('lets the key expire after the window', async () => {
    setNow('2024-05-01T12:00:00Z')

    await limitOncePerWindow('videos:check', 30)

    expect([...store.values()]).toEqual([{ count: 1, ttl: 30 }])
  })
})

describe('the rate limiters of the cron jobs', () => {
  beforeEach(() => {
    store.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('use the window of each job', async () => {
    setNow('2024-05-01T12:00:00Z')

    await videosCheck.limit('videos:check')
    await statsSnapshot.limit('stats:snapshot')

    expect([...store.values()].map(({ ttl }) => ttl)).toEqual([
      30,
      20 * 60 * 60,
    ])
  })

  it('reject the second run of a job in its window', async () => {
    // The windows are counted from the Unix epoch, not from midnight.
    const windowMilliseconds = 20 * 60 * 60 * 1000
    const start = Temporal.Instant.fromEpochMilliseconds(
      Math.ceil(
        Temporal.Instant.from('2024-05-01T00:00:00Z').epochMilliseconds /
          windowMilliseconds,
      ) * windowMilliseconds,
    )

    setNow(start.toString())
    await statsSnapshot.limit('stats:snapshot')

    setNow(start.add({ hours: 19, minutes: 59, seconds: 59 }).toString())

    await expect(statsSnapshot.limit('stats:snapshot')).resolves.toEqual({
      success: false,
    })
  })
})
