import * as Sentry from '@sentry/nextjs'
import type { Tables } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import type { YouTubeChannel } from '@shinju-date/youtube-scraper'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import { channelsUpdate as ratelimit } from '@/lib/ratelimit'
import { revalidateTags } from '@/lib/revalidate'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const MONITOR_SLUG = '/channels/update'

export const maxDuration = 120

type Channel = Pick<Tables<'channels'>, 'id' | 'name'> & {
  youtube_channel: {
    youtube_channel_id: string
  } | null
}

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

  const currentDateTime = Temporal.Now.instant()
  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select(
      'id, name, slug, youtube_channel:youtube_channels(youtube_channel_id)',
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

  const channelIds = channels
    .map((channel) => channel.youtube_channel?.youtube_channel_id)
    .filter((id): id is string => Boolean(id))
  const results: PromiseSettledResult<Channel | null>[] = []

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  try {
    await scraper.scrapeChannels({
      channelIds,
      onChannelScraped: async (youtubeChannel: YouTubeChannel) => {
        const result = await (async (): Promise<Channel | null> => {
          const channel = channels.find(
            (c) =>
              c.youtube_channel?.youtube_channel_id === youtubeChannel.id,
          )

          if (!channel) {
            throw new TypeError('A channel does not exist.')
          }

          // Note: YouTubeChannel from scraper doesn't include snippet with title
          // We need to fetch snippet data separately for this endpoint
          const {
            data: { items = [] },
          } = await youtubeClient.channels.list({
            id: [youtubeChannel.id],
            maxResults: 1,
            part: ['snippet'],
          })

          const item = items[0]
          if (!item?.snippet?.title) {
            throw new TypeError('A snippet is empty.')
          }

          // Dual-write to youtube_channels table (always upsert regardless of name change)
          const youtubeHandle = item.snippet.customUrl || null
          await supabaseClient
            .from('youtube_channels')
            .upsert(
              {
                channel_id: channel.id,
                youtube_channel_id: youtubeChannel.id,
                youtube_handle: youtubeHandle,
              },
              { onConflict: 'channel_id' },
            )
            .then(({ error: youtubeError }) => {
              if (youtubeError) {
                Sentry.captureException(youtubeError)
              }
            })

          if (item.snippet.title === channel.name) {
            return null
          }

          const { data, error} = await supabaseClient
            .from('channels')
            .update({
              name: item.snippet.title,
              updated_at: currentDateTime.toJSON(),
            })
            .eq('id', channel.id)
            .select('id, name, youtube_channel:youtube_channels(youtube_channel_id)')
            .single()

          if (error) {
            throw error
          }

          return data
        })()

        results.push({ status: 'fulfilled', value: result })
      },
    })
  } catch (error) {
    results.push({ reason: error, status: 'rejected' })
  }

  let isUpdated = false

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const newChannel = result.value
      const channelID = newChannel.youtube_channel?.youtube_channel_id
      const channel = channels.find(
        (c) => c.youtube_channel?.youtube_channel_id === channelID,
      )

      if (!channel) {
        continue
      }

      const changedColumns: Partial<typeof channel> = {}

      if (channel.name !== newChannel.name) {
        changedColumns.name = `${channel.name} -> ${newChannel.name}`
      }

      Sentry.logger.info(
        'Channel information has been updated.',
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
    await revalidateTags(['channels'], {
      signal: request.signal,
    })
  } else {
    Sentry.logger.info('No updated channels existed.')
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
