import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const captureCheckIn = vi.fn(() => 'check-in-id')
const captureException = vi.fn()
const flush = vi.fn()

vi.mock('@sentry/nextjs', () => ({ captureCheckIn, captureException, flush }))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('next/server', () => ({
  after: vi.fn((callback: () => unknown) => callback()),
}))

const { runCronJob } = await import('../cron')

const limit = vi.fn()
const job = {
  path: '/videos/update',
  ratelimit: { limit },
  ratelimitKey: 'videos:update:youtube',
  schedule: '1/5 * * * *',
}

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:5000/videos/update', {
    headers,
    method: 'POST',
  })
}

describe('runCronJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    limit.mockResolvedValue({ success: true })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('runs the job and reports it as ok', async () => {
    const run = vi.fn().mockResolvedValue(undefined)

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(204)
    expect(run).toHaveBeenCalledTimes(1)
    expect(limit).toHaveBeenCalledWith('videos:update:youtube')
    expect(captureCheckIn).toHaveBeenNthCalledWith(
      1,
      { monitorSlug: '/videos/update', status: 'in_progress' },
      {
        schedule: { type: 'crontab', value: '1/5 * * * *' },
        timezone: 'Etc/UTC',
      },
    )
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: 'check-in-id',
      monitorSlug: '/videos/update',
      status: 'ok',
    })
    expect(flush).toHaveBeenCalled()
  })

  it('reports a failing job as an error instead of crashing', async () => {
    const error = new Error('YouTube is down')
    const run = vi.fn().mockRejectedValue(error)

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'YouTube is down' })
    expect(captureException).toHaveBeenCalledWith(error)
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: 'check-in-id',
      monitorSlug: '/videos/update',
      status: 'error',
    })
  })

  it('rejects runs that follow the previous one too closely', async () => {
    limit.mockResolvedValue({ success: false })
    const run = vi.fn()

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(429)
    expect(run).not.toHaveBeenCalled()
    expect(captureCheckIn).not.toHaveBeenCalled()
  })

  it('rejects requests without the cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    const run = vi.fn()

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(401)
    expect(run).not.toHaveBeenCalled()
    expect(limit).not.toHaveBeenCalled()
  })

  it('accepts requests with the cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'secret')
    const run = vi.fn().mockResolvedValue(undefined)

    const response = await runCronJob(
      createRequest({ Authorization: 'Bearer secret' }),
      job,
      run,
    )

    expect(response.status).toBe(204)
    expect(run).toHaveBeenCalledTimes(1)
  })
})
