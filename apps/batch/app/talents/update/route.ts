import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { TwitchScraper } from '@shinju-date/twitch-scraper'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after, type NextRequest } from 'next/server'
import { processScrapedChannels, processTwitchUsers } from '@/lib/database'
import { parseProvider } from '@/lib/provider'
import { talentsUpdate as ratelimit } from '@/lib/ratelimit'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

export const maxDuration = 120

function getMonitorSlug(provider: 'youtube' | 'twitch') {
  return provider === 'twitch'
    ? '/talents/update?provider=twitch'
    : '/talents/update'
}

export async function POST(request: NextRequest): Promise<Response> {
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

  const providerResult = parseProvider(
    request.nextUrl.searchParams.get('provider'),
  )
  if (!providerResult.success) {
    return createErrorResponse(providerResult.error, {
      status: 400,
    })
  }
  const { provider } = providerResult

  const { success } = await ratelimit.limit(`channels:update:${provider}`)

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    return createErrorResponse(
      'There has been no interval since the last run.',
      {
        status: 429,
      },
    )
  }

  const monitorSlug = getMonitorSlug(provider)
  const checkInId = Sentry.captureCheckIn(
    {
      monitorSlug,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: provider === 'twitch' ? '51 1/3 * * *' : '21 1/3 * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  let isUpdated = false

  if (provider === 'youtube') {
    // Include active and retired talents (deleted are excluded).
    const { data: talents, error } = await supabaseClient
      .from('talents')
      .select('id, name, youtube_channels(id, name, youtube_channel_id)')
      .is('deleted_at', null)

    if (error) {
      after(async () => {
        Sentry.captureException(error)
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug,
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

    await using scraper = new YouTubeScraper({
      youtubeClient,
    })

    try {
      if (youTubeChannelIds.length > 0) {
        await scraper.scrapeChannels(
          { channelIds: youTubeChannelIds },
          async (youtubeChannels) => {
            isUpdated = await processScrapedChannels({
              supabaseClient,
              talents,
              youtubeChannels,
            })
          },
        )
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  } else {
    const { data: talents, error } = await supabaseClient
      .from('talents')
      .select(
        'id, twitch_users(id, name, talent_id, twitch_login_name, twitch_user_id)',
      )
      .is('deleted_at', null)

    if (error) {
      after(async () => {
        Sentry.captureException(error)
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug,
          status: 'error',
        })
        await Sentry.flush(10_000)
      })

      return createErrorResponse(error.message, {
        status: 500,
      })
    }

    const savedTwitchUsers = talents.flatMap(
      (talent) => talent.twitch_users || [],
    )
    const twitchUserIds = savedTwitchUsers
      .map((user) => user.twitch_user_id)
      .filter((id): id is string => Boolean(id))

    await using scraper = new TwitchScraper({ concurrency: 2 })

    try {
      if (twitchUserIds.length > 0) {
        await scraper.scrapeUsers(
          { userIds: twitchUserIds },
          async (twitchUsers) => {
            isUpdated = await processTwitchUsers({
              savedUsers: savedTwitchUsers,
              supabaseClient,
              twitchUsers,
            })
          },
        )
      }
    } catch (error) {
      Sentry.captureException(error)
    }
  }

  if (isUpdated) {
    await revalidateTags(['talents'], {
      signal: request.signal,
    })
  }

  after(async () => {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: 'ok',
    })

    await Sentry.flush(10_000)
  })

  return new Response(null, {
    status: 204,
  })
}

export const GET = POST
