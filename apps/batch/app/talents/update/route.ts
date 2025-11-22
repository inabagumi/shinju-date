import * as Sentry from '@sentry/nextjs'
import type { Tables } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after } from 'next/server'
import { processScrapedChannels } from '@/lib/database'
import { talentsUpdate as ratelimit } from '@/lib/ratelimit'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const MONITOR_SLUG = '/channels/update'

export const maxDuration = 120

export async function POST(request: Request): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (
    cronSecure &&
    !verifyCronRequest(request, {
      cronSecure,
    })
  ) {
    Sentry.logger.warn('CRON_SECRET did not match.')

    return createErrorResponse('Unauthorized', {
      status: 401,
    })
  }

  const { success } = await ratelimit.limit('channels:update')

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

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
        value: '21 1/3 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, name, youtube_channel:youtube_channels(name, youtube_channel_id)',
    )
    .is('deleted_at', null)

  if (error) {
    after(async () => {
      Sentry.captureException(error)

      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    return createErrorResponse(error.message, {
      status: 500,
    })
  }

  const youTubeChannelIds = talents
    .map((talent) => talent.youtube_channel?.youtube_channel_id)
    .filter((id): id is string => Boolean(id))
  const results: PromiseSettledResult<{
    id: string
    name: string
    youtube_channel: {
      name: string | null
      youtube_channel_id: string
    } | null
  } | null>[] = []

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  try {
    await scraper.scrapeChannels(
      { channelIds: youTubeChannelIds },
      async (youtubeChannels) => {
        // Move all processing logic to lib/database
        const channelResults = await processScrapedChannels({
          supabaseClient,
          talents,
          youtubeChannels,
          youtubeClient,
        })

        results.push(
          ...channelResults.map((result) => ({
            status: 'fulfilled' as const,
            value: result,
          })),
        )
      },
    )
  } catch (error) {
    results.push({ reason: error, status: 'rejected' })
  }

  let isUpdated = false

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const newTalent = result.value
      const ytChannelID = newTalent.youtube_channel?.youtube_channel_id
      const talent = talents.find(
        (c) => c.youtube_channel?.youtube_channel_id === ytChannelID,
      )

      if (!talent) {
        continue
      }

      const changedColumns: {
        talent_name?: string
        youtube_channel_name?: string
      } = {}

      // Log if YouTube channel name changed (not talent name)
      if (talent.youtube_channel?.name !== newTalent.youtube_channel?.name) {
        changedColumns.youtube_channel_name = `${talent.youtube_channel?.name} -> ${newTalent.youtube_channel?.name}`
      }

      Sentry.logger.info(
        'YouTube channel name has been updated.',
        changedColumns,
      )

      if (!isUpdated) {
        isUpdated = true
      }
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  if (isUpdated) {
    await revalidateTags(['talents'], {
      signal: request.signal,
    })
  } else {
    Sentry.logger.info('No updated talents existed.')
  }

  after(async () => {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: MONITOR_SLUG,
      status: 'ok',
    })

    await Sentry.flush(10_000)
  })

  return new Response(null, {
    status: 204,
  })
}

export const GET = POST
