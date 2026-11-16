import { revalidateTags } from '@shinju-date/web-cache'
import type { NextRequest } from 'next/server'
import { getTalentsUpdateJob } from '@/lib/crawler-jobs'
import { runCronJob } from '@/lib/cron'
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
      await revalidateTags(['talents'], { signal: request.signal })
    }
  })
}

export const GET = POST
