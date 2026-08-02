import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { getUsers as getTwitchUsers } from '@shinju-date/twitch-api-client'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after } from 'next/server'
import { processScrapedChannels, processTwitchUsers } from '@/lib/database'
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

  // Include active and retired talents (deleted are excluded).
  // Retired talents still get channel/user metadata updates at this moderate cadence.
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, name, youtube_channels(id, name, youtube_channel_id), twitch_users(id, name, talent_id, twitch_login_name, twitch_user_id)',
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
    .flatMap((talent) => talent.youtube_channels || [])
    .map((channel) => channel.youtube_channel_id)
    .filter((id): id is string => Boolean(id))

  const savedTwitchUsers = talents.flatMap(
    (talent) => talent.twitch_users || [],
  )
  const twitchUserIds = savedTwitchUsers
    .map((user) => user.twitch_user_id)
    .filter((id): id is string => Boolean(id))

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  let isUpdated = false

  try {
    if (youTubeChannelIds.length > 0) {
      await scraper.scrapeChannels(
        { channelIds: youTubeChannelIds },
        async (youtubeChannels) => {
          const youtubeUpdated = await processScrapedChannels({
            supabaseClient,
            talents,
            youtubeChannels,
          })
          isUpdated = isUpdated || youtubeUpdated
        },
      )
    }
  } catch (error) {
    Sentry.captureException(error)
  }

  try {
    if (twitchUserIds.length > 0) {
      const twitchUsers = await Array.fromAsync(
        getTwitchUsers({ ids: twitchUserIds }),
      )

      const twitchUpdated = await processTwitchUsers({
        savedUsers: savedTwitchUsers,
        supabaseClient,
        twitchUsers,
      })
      isUpdated = isUpdated || twitchUpdated
    }
  } catch (error) {
    Sentry.captureException(error)
  }

  if (isUpdated) {
    await revalidateTags(['talents'], {
      signal: request.signal,
    })
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
