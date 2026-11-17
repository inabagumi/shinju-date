import { beforeEach, describe, expect, it, vi } from 'vitest'

const captureCheckIn = vi.fn(() => 'check-in-id')
const captureException = vi.fn()
const flush = vi.fn()
const serverEnv: { CRON_SECRET: string | undefined } = {
  CRON_SECRET: undefined,
}

vi.mock('@sentry/nextjs', () => ({ captureCheckIn, captureException, flush }))

vi.mock('@shinju-date/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

vi.mock('../env', () => ({ serverEnv }))

vi.mock('next/server', () => ({
  after: vi.fn((callback: () => unknown) => callback()),
}))

const { runCronJob, verifyCronRequest } = await import('../cron')

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
    serverEnv.CRON_SECRET = undefined
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

  it('responds with the result of the job as JSON', async () => {
    const run = vi.fn().mockResolvedValue({ restored: 1, softDeleted: 2 })

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      restored: 1,
      softDeleted: 2,
    })
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: 'check-in-id',
      monitorSlug: '/videos/update',
      status: 'ok',
    })
  })

  it('lets the job clean up after it fails', async () => {
    const error = new Error('YouTube is down')
    const run = vi.fn().mockRejectedValue(error)
    const onError = vi.fn().mockResolvedValue(undefined)

    const response = await runCronJob(createRequest(), job, run, { onError })

    expect(response.status).toBe(500)
    expect(onError).toHaveBeenCalledWith(error)
    expect(captureException).toHaveBeenCalledWith(error)
  })

  it('reports the original error when the clean-up fails too', async () => {
    const error = new Error('YouTube is down')
    const run = vi.fn().mockRejectedValue(error)
    const onError = vi.fn().mockRejectedValue(new Error('Redis is down'))

    const response = await runCronJob(createRequest(), job, run, { onError })

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: 'YouTube is down' })
    expect(captureException).toHaveBeenCalledWith(error)
    expect(captureCheckIn).toHaveBeenLastCalledWith({
      checkInId: 'check-in-id',
      monitorSlug: '/videos/update',
      status: 'error',
    })
  })

  it('does not call the clean-up after a job that succeeds', async () => {
    const onError = vi.fn()

    await runCronJob(
      createRequest(),
      job,
      vi.fn().mockResolvedValue(undefined),
      {
        onError,
      },
    )

    expect(onError).not.toHaveBeenCalled()
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
    serverEnv.CRON_SECRET = 'secret'
    const run = vi.fn()

    const response = await runCronJob(createRequest(), job, run)

    expect(response.status).toBe(401)
    expect(run).not.toHaveBeenCalled()
    expect(limit).not.toHaveBeenCalled()
  })

  it('accepts requests with the cron secret', async () => {
    serverEnv.CRON_SECRET = 'secret'
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

describe('verifyCronRequest', () => {
  it('should return true when Authorization header matches', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Bearer secret-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(true)
  })

  it('should return false when Authorization header is missing', () => {
    const request = new Request('https://example.com')

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should return false when Authorization type is not Bearer', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Basic secret-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should return false when credentials do not match', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: 'Bearer wrong-token',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(false)
  })

  it('should handle extra whitespace in Authorization header', () => {
    const request = new Request('https://example.com', {
      headers: {
        Authorization: '  Bearer   secret-token  ',
      },
    })

    const result = verifyCronRequest(request, { cronSecure: 'secret-token' })

    expect(result).toBe(true)
  })
})
