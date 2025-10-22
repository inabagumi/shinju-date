import type { SupabaseClient } from '@supabase/supabase-js'
import type { Redis } from '@upstash/redis'
import { vi } from 'vitest'
import {
  checkRedisHealth,
  checkSupabaseHealth,
  createReadinessResponse,
  runHealthChecks,
} from '../index.js'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
} as unknown as SupabaseClient

// Mock Redis client
const mockRedisClient = {
  ping: vi.fn(),
} as unknown as Redis

describe('checkSupabaseHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ok status when database connection is successful', async () => {
    ;(mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: null }),
      }),
    })

    const result = await checkSupabaseHealth(mockSupabaseClient)

    expect(result).toEqual({ status: 'ok' })
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('channels')
  })

  it('should return error status when database query fails', async () => {
    const mockError = { message: 'Connection failed' }
    ;(mockSupabaseClient.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ error: mockError }),
      }),
    })

    const result = await checkSupabaseHealth(mockSupabaseClient)

    expect(result).toEqual({
      details: 'Connection failed',
      message: 'Database connection failed',
      status: 'error',
    })
  })

  it('should return error status when exception is thrown', async () => {
    ;(mockSupabaseClient.from as any).mockImplementation(() => {
      throw new Error('Network error')
    })

    const result = await checkSupabaseHealth(mockSupabaseClient)

    expect(result).toEqual({
      details: 'Network error',
      message: 'Database health check failed',
      status: 'error',
    })
  })
})

describe('checkRedisHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return ok status when Redis ping is successful', async () => {
    ;(mockRedisClient.ping as any).mockResolvedValue('PONG')

    const result = await checkRedisHealth(mockRedisClient)

    expect(result).toEqual({ status: 'ok' })
    expect(mockRedisClient.ping).toHaveBeenCalled()
  })

  it('should return error status when Redis ping returns unexpected value', async () => {
    ;(mockRedisClient.ping as any).mockResolvedValue('UNEXPECTED')

    const result = await checkRedisHealth(mockRedisClient)

    expect(result).toEqual({
      details: 'Expected PONG, got: UNEXPECTED',
      message: 'Redis connection failed',
      status: 'error',
    })
  })

  it('should return error status when Redis ping throws exception', async () => {
    ;(mockRedisClient.ping as any).mockRejectedValue(
      new Error('Connection timeout'),
    )

    const result = await checkRedisHealth(mockRedisClient)

    expect(result).toEqual({
      details: 'Connection timeout',
      message: 'Redis health check failed',
      status: 'error',
    })
  })
})

describe('runHealthChecks', () => {
  it('should return ok status when all checks pass', async () => {
    const checks = [
      vi.fn().mockResolvedValue({ status: 'ok' }),
      vi.fn().mockResolvedValue({ status: 'ok' }),
    ]

    const result = await runHealthChecks(checks)

    expect(result.status).toBe('ok')
    expect(result.results).toHaveLength(2)
    expect(result.results.every((r) => r.status === 'ok')).toBe(true)
  })

  it('should return error status when one check fails', async () => {
    const checks = [
      vi.fn().mockResolvedValue({ status: 'ok' }),
      vi.fn().mockResolvedValue({
        details: 'Error details',
        message: 'Check failed',
        status: 'error',
      }),
    ]

    const result = await runHealthChecks(checks)

    expect(result.status).toBe('error')
    expect(result.results).toHaveLength(2)
    expect(result.results[1].status).toBe('error')
  })

  it('should run all checks even if some fail', async () => {
    const checks = [
      vi.fn().mockResolvedValue({ status: 'error' }),
      vi.fn().mockResolvedValue({ status: 'ok' }),
    ]

    const result = await runHealthChecks(checks)

    expect(checks[0]).toHaveBeenCalled()
    expect(checks[1]).toHaveBeenCalled()
    expect(result.results).toHaveLength(2)
  })
})

describe('createReadinessResponse', () => {
  it('should return 200 response for ok status', async () => {
    const response = createReadinessResponse('ok')

    expect(response.status).toBe(200)

    const json = await response.json()
    expect(json).toEqual({ status: 'ok' })
  })

  it('should return 503 response for error status with results', async () => {
    const results = [
      { status: 'ok' as const },
      {
        details: 'Connection lost',
        message: 'DB failed',
        status: 'error' as const,
      },
    ]

    const response = createReadinessResponse('error', results)

    expect(response.status).toBe(503)

    const json = await response.json()
    expect(json).toEqual({
      checks: results,
      message: 'Service not ready',
      status: 'error',
    })
  })

  it('should return 503 response for error status with error details', async () => {
    const errorDetails = {
      details: 'Custom error details',
      message: 'Custom error message',
    }

    const response = createReadinessResponse('error', undefined, errorDetails)

    expect(response.status).toBe(503)

    const json = await response.json()
    expect(json).toEqual({
      details: 'Custom error details',
      message: 'Custom error message',
      status: 'error',
    })
  })

  it('should return 503 response with default message for error status without details', async () => {
    const response = createReadinessResponse('error')

    expect(response.status).toBe(503)

    const json = await response.json()
    expect(json).toEqual({
      message: 'Health check failed',
      status: 'error',
    })
  })
})
