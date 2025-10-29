import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { after } from 'next/server'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import { videosUpdate as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { revalidateTags } from '@/lib/revalidate'
import { scrape, type Video } from '@/lib/scraper'
import { supabaseClient } from '@/lib/supabase'
import { getChannels, youtubeClient } from '@/lib/youtube'

const MONITOR_SLUG = '/videos/update'

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

  const { success } = await ratelimit.limit('videos:update')

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
        value: '1/10 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()

  const { data: savedChannels, error } = await supabaseClient
    .from('channels')
    .select('id, slug, youtube_channel:youtube_channels(youtube_channel_id)')
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

  const channelIDs = savedChannels.map((savedChannel) => savedChannel.slug)
  const channels = await Array.fromAsync(
    getChannels({
      ids: channelIDs,
    }),
  )

  if (channels.length < 1) {
    throw new TypeError('There are no channels.')
  }

  const queue = new PQueue({
    concurrency: 1,
    interval: 250,
  })

  const results = await Promise.allSettled(
    savedChannels.map((savedChannel) => {
      const originalChannel = channels.find(
        (item) => item.id === savedChannel.slug,
      )

      if (!originalChannel) {
        return Promise.reject(new TypeError('Channel does not exist.'))
      }

      return queue.add(() =>
        scrape({
          channel: originalChannel,
          currentDateTime,
          savedChannel: savedChannel,
          supabaseClient,
          youtubeClient,
        }),
      )
    }),
  )

  const videos: Video[] = []

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      for (const video of result.value) {
        videos.push(video)
      }
    } else if (result.status === 'rejected') {
      Sentry.captureException(result.reason)
    }
  }

  if (videos.length > 0) {
    for (const video of videos) {
      const publishedAt = Temporal.Instant.from(video.published_at)

      Sentry.logger.info('The video has been saved.', {
        duration: video.duration,
        id: video.slug,
        publishedAt: publishedAt.toString(),
        title: video.title,
      })
    }

    await revalidateTags(['videos'], {
      signal: request.signal,
    })
  } else {
    Sentry.logger.info('No updated channels existed.')
  }

  // Update last sync timestamp in Redis
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, currentDateTime.toString())

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
