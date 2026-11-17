import { CACHE_TAGS } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import { revalidateTags } from '@shinju-date/web-cache'
import { runCronJob } from '@/lib/cron'
import { VIDEOS_CASCADE_FROM_TALENTS_JOB } from '@/lib/jobs'
import { supabaseClient } from '@/lib/supabase'
import {
  CascadePhaseError,
  cascadeVideosFromTalents,
} from './_lib/cascade-from-talents'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  return runCronJob(
    request,
    VIDEOS_CASCADE_FROM_TALENTS_JOB,
    async () => {
      const result = await cascadeVideosFromTalents(supabaseClient)

      if (result.softDeleted > 0 || result.restored > 0) {
        await revalidateTags([CACHE_TAGS.VIDEOS, CACHE_TAGS.TALENTS], {
          signal: request.signal,
        })
      }

      logger.info('タレント連鎖の動画ソフトデリート／復旧が完了しました', {
        restored: result.restored,
        softDeleted: result.softDeleted,
      })

      return result
    },
    {
      onError: async (error) => {
        if (!(error instanceof CascadePhaseError)) {
          return
        }

        // One phase may have committed; keep visibility and revalidate if needed.
        logger.error('タレント連鎖の動画処理でフェーズ失敗がありました', {
          error,
          restored: error.restored,
          softDeleted: error.softDeleted,
        })

        if (error.softDeleted > 0 || error.restored > 0) {
          await revalidateTags([CACHE_TAGS.VIDEOS, CACHE_TAGS.TALENTS], {
            signal: request.signal,
          })
        }
      },
    },
  )
}

export const GET = POST
