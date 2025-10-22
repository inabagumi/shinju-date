import type { SupabaseClient } from '@supabase/supabase-js'
import type { Redis } from '@upstash/redis'

export interface HealthCheckResult {
  status: 'ok' | 'error'
  message?: string
  details?: string
}

/**
 * Check Supabase database connectivity
 */
export async function checkSupabaseHealth(
  supabaseClient: SupabaseClient,
): Promise<HealthCheckResult> {
  try {
    const { error } = await supabaseClient
      .from('channels')
      .select('id')
      .limit(1)

    if (error) {
      return {
        details: error.message,
        message: 'Database connection failed',
        status: 'error',
      }
    }

    return { status: 'ok' }
  } catch (error) {
    return {
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Database health check failed',
      status: 'error',
    }
  }
}

/**
 * Check Upstash Redis connectivity
 */
export async function checkRedisHealth(
  redisClient: Redis,
): Promise<HealthCheckResult> {
  try {
    const result = await redisClient.ping()

    if (result !== 'PONG') {
      return {
        details: `Expected PONG, got: ${result}`,
        message: 'Redis connection failed',
        status: 'error',
      }
    }

    return { status: 'ok' }
  } catch (error) {
    return {
      details: error instanceof Error ? error.message : 'Unknown error',
      message: 'Redis health check failed',
      status: 'error',
    }
  }
}

/**
 * Run multiple health checks and return combined result
 */
export async function runHealthChecks(
  checks: Array<() => Promise<HealthCheckResult>>,
): Promise<{ status: 'ok' | 'error'; results: HealthCheckResult[] }> {
  const results = await Promise.all(checks.map((check) => check()))
  const hasError = results.some((result) => result.status === 'error')

  return {
    results,
    status: hasError ? 'error' : 'ok',
  }
}

/**
 * Create a readiness check response
 */
export function createReadinessResponse(
  status: 'ok' | 'error',
  results?: HealthCheckResult[],
): Response {
  if (status === 'ok') {
    return Response.json({ status: 'ok' })
  }

  return Response.json(
    {
      checks: results,
      message: 'Service not ready',
      status: 'error',
    },
    { status: 503 },
  )
}
