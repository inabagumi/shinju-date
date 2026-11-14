import { createErrorResponse } from '@shinju-date/helpers'
import { revalidateTags } from '@shinju-date/web-cache'
import type { NextRequest } from 'next/server'
import { getTalentsUpdateJob } from '@/lib/crawler-jobs'
import { runCronJob } from '@/lib/cron'
import { parseProvider } from '@/lib/provider'
import { createScraper } from '@/lib/scraper'

export const maxDuration = 120

export async function POST(request: NextRequest): Promise<Response> {
  const providerResult = parseProvider(
    request.nextUrl.searchParams.get('provider'),
  )

  if (!providerResult.success) {
    return createErrorResponse(providerResult.error, { status: 400 })
  }

  const { provider } = providerResult

  return runCronJob(request, getTalentsUpdateJob(provider), async () => {
    const changed = await createScraper(provider).syncAccounts()

    if (changed) {
      await revalidateTags(['talents'], { signal: request.signal })
    }
  })
}

export const GET = POST
