import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { revalidateTags } from '@shinju-date/web-cache'
import { after } from 'next/server'
import { videosCascadeFromTalents as ratelimit } from '@/lib/ratelimit'
import { supabaseClient } from '@/lib/supabase'
import {
  CascadePhaseError,
  cascadeVideosFromTalents,
} from './_lib/cascade-from-talents'

const MONITOR_SLUG = '/videos/cascade-from-talents'
const CRON_SCHEDULE = '*/5 * * * *'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (
    cronSecure &&
    !verifyCronRequest(request, {
      cronSecure,
    })
  ) {
    logger.warn('CRON_SECRETが一致しませんでした')

    return createErrorResponse('Unauthorized', {
      status: 401,
    })
  }

  const { success } = await ratelimit.limit('videos:cascade-from-talents')

  if (!success) {
    logger.warn('前回の実行から間隔が空いていません')

    return createErrorResponse(
      'There has been no interval since the last run.',
      {
        status: 429,
      },
    )
  }

  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug: MONITOR_SLUG,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: CRON_SCHEDULE,
      },
      timezone: 'Etc/UTC',
    },
  )

  try {
    const result = await cascadeVideosFromTalents(supabaseClient)

    if (result.softDeleted > 0 || result.restored > 0) {
      await revalidateTags(['videos', 'talents'], {
        signal: request.signal,
      })
    }

    logger.info('タレント連鎖の動画ソフトデリート／復旧が完了しました', {
      restored: result.restored,
      softDeleted: result.softDeleted,
    })

    after(async () => {
      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'ok',
      })

      await Sentry.flush(10_000)
    })

    return Response.json(result, {
      status: 200,
    })
  } catch (error) {
    if (error instanceof CascadePhaseError) {
      // One phase may have committed; keep visibility and revalidate if needed.
      logger.error('タレント連鎖の動画処理でフェーズ失敗がありました', {
        error,
        restored: error.restored,
        softDeleted: error.softDeleted,
      })

      if (error.softDeleted > 0 || error.restored > 0) {
        try {
          await revalidateTags(['videos', 'talents'], {
            signal: request.signal,
          })
        } catch (revalidateError) {
          logger.error('部分成功後のキャッシュ再検証に失敗しました', {
            error: revalidateError,
          })
        }
      }
    }

    after(async () => {
      Sentry.captureException(error)

      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error',
      {
        status: 500,
      },
    )
  }
}

export const GET = POST
