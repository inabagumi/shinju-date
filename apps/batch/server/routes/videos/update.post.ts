import * as Sentry from '@sentry/node'
import { REDIS_KEYS } from '@shinju-date/constants'
import { revalidateTags } from '@shinju-date/web-cache'
import PQueue from 'p-queue'
import { Temporal } from 'temporal-polyfill'

const MONITOR_SLUG = '/videos/update'

export default defineEventHandler(async (event) => {
  // Verify cron authentication
  verifyCronAuth(event)

  const { success } = await videosUpdate.limit('videos:update')

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
        value: '1/10 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()

  const { data: savedTalents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, youtube_channel:youtube_channels!inner(id, youtube_channel_id)',
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

  const channelIDs = savedTalents.map((savedTalent) => {
    const ytChannel = savedTalent.youtube_channel
    return ytChannel.youtube_channel_id
  })
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
    savedTalents.map((savedTalent) => {
      const ytChannel = savedTalent.youtube_channel
      const youtubeChannelId = ytChannel.youtube_channel_id

      const originalChannel = channels.find(
        (item) => item.id === youtubeChannelId,
      )

      if (!originalChannel) {
        return Promise.reject(new TypeError('Channel does not exist.'))
      }

      return queue.add(() =>
        scrape({
          channel: originalChannel,
          currentDateTime,
          savedYouTubeChannel: {
            id: ytChannel.id,
            talent_id: savedTalent.id,
            youtube_channel_id: ytChannel.youtube_channel_id,
          },
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
      const youtubeVideoId = video.youtube_video?.youtube_video_id

      Sentry.logger.info('The video has been saved.', {
        duration: video.duration,
        id: youtubeVideoId,
        publishedAt: publishedAt.toString(),
        title: video.title,
      })
    }

    // Note: In Nitro, we don't have request.signal, so we omit it
    await revalidateTags(['videos'])
  } else {
    Sentry.logger.info('No updated channels existed.')
  }

  // Update last sync timestamp in Redis
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, currentDateTime.toString())

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
