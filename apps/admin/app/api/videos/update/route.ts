import { Temporal } from '@js-temporal/polyfill'
import { verifyCronRequest } from '@shinju-date/helpers'
import PQueue from 'p-queue'
import { captureException, defaultLogger as logger } from '@/lib/logging'
import { videosUpdate as ratelimit } from '@/lib/ratelimit'
import { type Video, scrape } from '@/lib/scraper'
import { createErrorResponse } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'
import { type FilteredYouTubeChannel, getChannels } from '@/lib/youtube'

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 120

export async function POST(request: Request): Promise<Response> {
  if (!verifyCronRequest(request, { cronSecure: process.env.CRON_SECRET })) {
    return createErrorResponse(401, 'Unauthorized')
  }

  const { success } = await ratelimit.limit('videos:update')

  if (!success) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })

  const { data: savedChannels, error } = await supabaseClient
    .from('channels')
    .select('id, slug')
    .is('deleted_at', null)

  if (error) {
    throw error
  }

  const channelIDs = savedChannels.map((savedChannel) => savedChannel.slug)
  const channels: FilteredYouTubeChannel[] = []

  try {
    for await (const channel of getChannels({ ids: channelIDs })) {
      channels.push(channel)
    }
  } catch (error) {
    captureException(error)

    return createErrorResponse(500, 'Internal Server Error')
  }

  if (channels.length < 1) {
    return createErrorResponse(404, 'There are no channels.')
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
        publishedAt,
        title: video.title
      })
    }
  }

  return new Response(null, {
    status: 204
  })
}

export const GET = POST
