import * as Sentry from '@sentry/nextjs'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { defaultLogger as logger } from '@shinju-date/logging'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'
import { videosUpdate as ratelimit } from '@/lib/ratelimit'
import { revalidateTags } from '@/lib/revalidate'
import { type Video, scrape } from '@/lib/scraper'
import { captureException } from '@/lib/sentry'
import { supabaseClient } from '@/lib/supabase'
import { type FilteredYouTubeChannel, getChannels } from '@/lib/youtube'

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 120

export async function POST(request: Request): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (cronSecure && !verifyCronRequest(request, { cronSecure })) {
    return createErrorResponse('Unauthorized', { status: 401 })
  }

  const { success } = await ratelimit.limit('videos:update')

  if (!success) {
    return createErrorResponse(
      'There has been no interval since the last run.',
      { status: 429 }
    )
  }

  try {
    await Sentry.withMonitor(
      '/videos/update',
      async () => {
        const currentDateTime = Temporal.Now.instant()

        const { data: savedChannels, error } = await supabaseClient
          .from('channels')
          .select('id, slug')
          .is('deleted_at', null)

        if (error) {
          throw new TypeError(error.message, { cause: error })
        }

        const channelIDs = savedChannels.map(
          (savedChannel) => savedChannel.slug
        )
        const channels: FilteredYouTubeChannel[] = []

        for await (const channel of getChannels({ ids: channelIDs })) {
          channels.push(channel)
        }

        if (channels.length < 1) {
          throw new TypeError('There are no channels.')
        }

        const queue = new PQueue({
          concurrency: 1,
          interval: 250
        })

        const results = await Promise.allSettled(
          savedChannels.map((savedChannel) => {
            const originalChannel = channels.find(
              (item) => item.id === savedChannel.slug
            )

            if (!originalChannel) {
              return Promise.reject(new TypeError('Channel does not exist.'))
            }

            return queue.add(() =>
              scrape({
                channel: originalChannel,
                currentDateTime,
                savedChannel: savedChannel,
                supabaseClient
              })
            )
          })
        )

        const videos: Video[] = []

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            for (const video of result.value) {
              videos.push(video)
            }
          } else if (result.status === 'rejected') {
            captureException(result.reason)
          }
        }

        if (videos.length > 0) {
          for (const video of videos) {
            const publishedAt = Temporal.Instant.from(video.published_at)

            logger.info('The video has been saved.', {
              duration: video.duration,
              id: video.slug,
              publishedAt: publishedAt.toString(),
              title: video.title
            })
          }

          await revalidateTags(['videos'], {
            signal: request.signal
          })
        }
      },
      {
        schedule: {
          type: 'crontab',
          value: '1/10 * * * *'
        },
        timezone: 'Etc/UTC'
      }
    )
  } catch (error) {
    captureException(error)

    // wait for logging
    await Sentry.flush(2_000)

    const message =
      error instanceof Error ? error.message : 'Internal Server Error'

    return createErrorResponse(message, { status: 500 })
  }

  // wait for logging
  await Sentry.flush(2_000)

  return new Response(null, {
    status: 204
  })
}

export const GET = POST
