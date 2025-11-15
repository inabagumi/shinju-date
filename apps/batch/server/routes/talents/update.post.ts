import * as Sentry from '@sentry/node'
import type { Tables } from '@shinju-date/database'
import { revalidateTags } from '@shinju-date/web-cache'
import type { YouTubeChannel } from '@shinju-date/youtube-scraper'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'

const MONITOR_SLUG = '/channels/update'

type Talent = Pick<Tables<'talents'>, 'id' | 'name'> & {
  youtube_channel: {
    name: string | null
    youtube_channel_id: string
  } | null
}

export default defineEventHandler(async (event) => {
  // Verify cron authentication
  verifyCronAuth(event)

  const { success } = await talentsUpdate.limit('channels:update')

  if (!success) {
    Sentry.logger.warn('There has been no interval since the last run.')

    throw createError({
      message: 'There has been no interval since the last run.',
      statusCode: 429,
    })
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
    afterResponse(event, async () => {
      Sentry.captureException(error)

      Sentry.captureCheckIn({
        checkInId,
        monitorSlug: MONITOR_SLUG,
        status: 'error',
      })

      await Sentry.flush(10_000)
    })

    throw createError({
      message: error.message,
      statusCode: 500,
    })
  }

  const youTubeChannelIds = talents
    .map((talent) => talent.youtube_channel?.youtube_channel_id)
    .filter((id): id is string => Boolean(id))
  const results: PromiseSettledResult<Talent | null>[] = []

  await using scraper = new YouTubeScraper({
    youtubeClient,
  })

  try {
    await scraper.scrapeChannels({
      channelIds: youTubeChannelIds,
      onChannelScraped: async (youtubeChannel: YouTubeChannel) => {
        const result = await (async (): Promise<Talent | null> => {
          const talent = talents.find(
            (t) => t.youtube_channel?.youtube_channel_id === youtubeChannel.id,
          )

          if (!talent) {
            throw new TypeError('A talent does not exist.')
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

          // Get current YouTube channel name from database
          const currentYouTubeChannelName = talent.youtube_channel?.name

          // Update youtube_channels table with YouTube channel name
          const youtubeHandle = item.snippet.customUrl || null
          await supabaseClient
            .from('youtube_channels')
            .upsert(
              {
                name: item.snippet.title,
                talent_id: talent.id,
                youtube_channel_id: youtubeChannel.id,
                youtube_handle: youtubeHandle,
              },
              { onConflict: 'talent_id' },
            )
            .then(({ error: youtubeError }) => {
              if (youtubeError) {
                Sentry.captureException(youtubeError)
              }
            })

          // Return null if YouTube channel name hasn't changed
          if (item.snippet.title === currentYouTubeChannelName) {
            return null
          }

          // Fetch updated talent data to return
          const { data, error } = await supabaseClient
            .from('talents')
            .select(
              'id, name, youtube_channel:youtube_channels(name, youtube_channel_id)',
            )
            .eq('id', talent.id)
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
    // Note: In Nitro, we don't have request.signal, so we omit it
    await revalidateTags(['talents'])
  } else {
    Sentry.logger.info('No updated talents existed.')
  }

  afterResponse(event, async () => {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug: MONITOR_SLUG,
      status: 'ok',
    })

    await Sentry.flush(10_000)
  })

  setResponseStatus(event, 204)
  return null
})
