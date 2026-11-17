import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { after } from 'next/server'
import { serverEnv } from './env'

/** How long to wait for Sentry to send buffered events after the response. */
const SENTRY_FLUSH_TIMEOUT_MS = 10_000

export interface CronJob {
  /**
   * Path (including the query string) Vercel Cron requests.
   * Doubles as the Sentry monitor slug.
   */
  path: string
  /** Rate limiter that guards against overlapping or repeated runs. */
  ratelimit: {
    limit(identifier: string): Promise<{ success: boolean }>
  }
  /** Identifier counted by `ratelimit`. */
  ratelimitKey: string
  /** Crontab expression in UTC. Must match the entry in `vercel.json`. */
  schedule: string
}

export interface RunCronJobOptions {
  /**
   * Called after `run` throws, before the run is reported as failed. Use it
   * to clean up after work that was partly done. An error it throws is
   * logged and does not change the response.
   */
  onError?: (error: unknown) => Promise<void>
}

/**
 * Runs a cron route handler with the plumbing every job needs:
 *
 * 1. rejects requests without the cron secret (401)
 * 2. rejects runs that follow the previous one too closely (429)
 * 3. reports the run to Sentry Cron Monitoring, as `ok` or `error`
 * 4. turns a thrown error into a 500 instead of an unreported crash
 *
 * `run` only has to do the actual work and throw when it fails. What it
 * returns is sent as JSON with 200; when it returns nothing, the response is
 * 204.
 */
export async function runCronJob<T>(
  request: Request,
  job: CronJob,
  run: () => Promise<T>,
  { onError }: RunCronJobOptions = {},
): Promise<Response> {
  const cronSecure = serverEnv.CRON_SECRET

  if (cronSecure && !verifyCronRequest(request, { cronSecure })) {
    logger.warn('CRON_SECRETが一致しませんでした', { path: job.path })

    return createErrorResponse('Unauthorized', { status: 401 })
  }

  const { success } = await job.ratelimit.limit(job.ratelimitKey)

  if (!success) {
    logger.warn('前回の実行から間隔が空いていません', { path: job.path })

    return createErrorResponse(
      'There has been no interval since the last run.',
      { status: 429 },
    )
  }

  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug: job.path,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: job.schedule,
      },
      timezone: 'Etc/UTC',
    },
  )

  after(() => Sentry.flush(SENTRY_FLUSH_TIMEOUT_MS))

  let result: T

  try {
    result = await run()
  } catch (error) {
    if (onError) {
      try {
        await onError(error)
      } catch (onErrorError) {
        logger.error('失敗したジョブの後始末に失敗しました', {
          error: onErrorError,
          path: job.path,
        })
      }
    }

    Sentry.captureException(error)
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: job.path,
      status: 'error',
    })

    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      { status: 500 },
    )
  }

  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: job.path,
    status: 'ok',
  })

  if (result === undefined) {
    return new Response(null, { status: 204 })
  }

  return Response.json(result, { status: 200 })
}
