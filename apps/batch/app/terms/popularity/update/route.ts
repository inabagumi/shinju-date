import { logger } from '@shinju-date/logger'
import { runCronJob } from '@/lib/cron'
import { TERMS_POPULARITY_UPDATE_JOB } from '@/lib/jobs'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { updateTermPopularity } from './_lib/update-term-popularity'

export const maxDuration = 60

export async function POST(request: Request): Promise<Response> {
  return runCronJob(request, TERMS_POPULARITY_UPDATE_JOB, async () => {
    const result = await updateTermPopularity(redisClient, supabaseClient)

    logger.info('用語の人気度更新が正常に完了しました', result)

    return result
  })
}

export const GET = POST
