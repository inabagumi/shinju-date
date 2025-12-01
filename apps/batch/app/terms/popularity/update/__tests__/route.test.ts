import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
const mockSupabaseClient = {
  from: vi.fn(),
}

const mockRedisClient = {
  zrange: vi.fn(),
}

const mockRatelimit = {
  limit: vi.fn(),
}

const mockUpdateTermPopularity = vi.fn()

// Mock modules
vi.mock('@/lib/supabase', () => ({
  supabaseClient: mockSupabaseClient,
}))

vi.mock('@/lib/redis', () => ({
  redisClient: mockRedisClient,
}))

vi.mock('@/lib/ratelimit', () => ({
  termsPopularityUpdate: mockRatelimit,
}))

vi.mock('../_lib/update-term-popularity', () => ({
  updateTermPopularity: mockUpdateTermPopularity,
}))

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn(() => 'mock-check-in-id'),
  captureException: vi.fn(),
  flush: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('next/server', () => ({
  after: vi.fn((fn: () => void) => {
    // Execute the function immediately in tests
    fn()
  }),
}))

describe('POST /terms/popularity/update', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    // Import after mocks are set up
    const module = await import('../route')
    POST = module.POST

    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully update term popularity', async () => {
    // Setup
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockUpdateTermPopularity.mockResolvedValue({
      notFound: 5,
      total: 100,
      updated: 95,
    })

    // Execute
    const request = new Request(
      'http://localhost:5000/terms/popularity/update',
      {
        method: 'POST',
      },
    )
    const response = await POST(request)

    // Verify
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({
      notFound: 5,
      total: 100,
      updated: 95,
    })
    expect(mockUpdateTermPopularity).toHaveBeenCalledWith(
      mockRedisClient,
      mockSupabaseClient,
    )
  })

  it('should return 429 when rate limited', async () => {
    // Setup
    mockRatelimit.limit.mockResolvedValue({ success: false })

    // Execute
    const request = new Request(
      'http://localhost:5000/terms/popularity/update',
      {
        method: 'POST',
      },
    )
    const response = await POST(request)

    // Verify
    expect(response.status).toBe(429)
    expect(mockUpdateTermPopularity).not.toHaveBeenCalled()
  })

  it('should return 500 when update fails', async () => {
    // Setup
    mockRatelimit.limit.mockResolvedValue({ success: true })
    mockUpdateTermPopularity.mockRejectedValue(new Error('Database error'))

    // Execute
    const request = new Request(
      'http://localhost:5000/terms/popularity/update',
      {
        method: 'POST',
      },
    )
    const response = await POST(request)

    // Verify
    expect(response.status).toBe(500)
  })

  it('should verify CRON_SECRET when provided', async () => {
    // Setup
    const originalEnv = process.env['CRON_SECRET']
    process.env['CRON_SECRET'] = 'test-secret'

    mockRatelimit.limit.mockResolvedValue({ success: true })

    // Execute with wrong secret
    const request = new Request(
      'http://localhost:5000/terms/popularity/update',
      {
        headers: {
          Authorization: 'Bearer wrong-secret',
        },
        method: 'POST',
      },
    )
    const response = await POST(request)

    // Verify
    expect(response.status).toBe(401)
    expect(mockUpdateTermPopularity).not.toHaveBeenCalled()

    // Cleanup
    process.env['CRON_SECRET'] = originalEnv
  })
})
