import { CACHE_TAGS } from '@shinju-date/constants'
import { revalidateTags } from '@shinju-date/web-cache'
import type { NextRequest } from 'next/server'
import { runCronJob } from '@/lib/cron'
import { getTalentsUpdateJob } from '@/lib/jobs'
import { providerQuerySchema } from '@/lib/provider'
import { parseQuery } from '@/lib/query'
import { createScraper } from '@/lib/scraper'

export const maxDuration = 120

export async function POST(request: NextRequest): Promise<Response> {
  const query = parseQuery(providerQuerySchema, request)

  if (query instanceof Response) {
    return query
  }

  const { provider } = query

  return runCronJob(request, getTalentsUpdateJob(provider), async () => {
    const changed = await createScraper(provider).syncAccounts()

    if (changed) {
      await revalidateTags([CACHE_TAGS.TALENTS], { signal: request.signal })
    }
  })
}

export const GET = POST
