import * as Sentry from '@sentry/nextjs'
import { REDIS_KEYS } from '@shinju-date/constants'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { logger } from '@shinju-date/logger'
import { TwitchScraper } from '@shinju-date/twitch-scraper'
import { revalidateTags } from '@shinju-date/web-cache'
import { YouTubeScraper } from '@shinju-date/youtube-scraper'
import { after, type NextRequest } from 'next/server'
import { Temporal } from 'temporal-polyfill'
import type { Video } from '@/lib/database'
import { parseProvider } from '@/lib/provider'
import { videosUpdate as ratelimit } from '@/lib/ratelimit'
import { redisClient } from '@/lib/redis'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'
import { getMonitorSlug } from './_lib/constants'
import { saveTwitchVideos } from './_lib/save-twitch-videos'
import { saveScrapedVideos } from './_lib/save-videos'

export const maxDuration = 120

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

  const { success } = await ratelimit.limit(`videos:update:${provider}`)

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
        value: provider === 'twitch' ? '3/5 * * * *' : '1/5 * * * *',
      },
      timezone: 'Etc/UTC',
    },
  )

  const currentDateTime = Temporal.Now.instant()
  const videos: Video[] = []

  if (provider === 'youtube') {
    // High-frequency new-video scrape: active talents only.
    const { data: savedTalents, error } = await supabaseClient
      .from('talents')
      .select('id, youtube_channels!inner(id, youtube_channel_id)')
      .eq('status', 'active')
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

    const channelToTalentMap = new Map<
      string,
      {
        id: string
        youtubeChannelId: string
      }
    >()

    for (const savedTalent of savedTalents) {
      for (const ytChannel of savedTalent.youtube_channels) {
        channelToTalentMap.set(ytChannel.youtube_channel_id, {
          id: savedTalent.id,
          youtubeChannelId: ytChannel.id,
        })
      }
    }

    const channelIDs = Array.from(channelToTalentMap.keys())

    if (channelIDs.length > 0) {
      await using scraper = new YouTubeScraper({
        concurrency: 1,
        youtubeClient,
      })

      await scraper.scrapeNewVideos(
        { channelIds: channelIDs },
        async (channelId, scrapedVideos) => {
          const talentInfo = channelToTalentMap.get(channelId)
          if (!talentInfo) {
            logger.warn('タレント情報が見つかりませんでした', {
              channelId,
            })
            return
          }

          try {
            const savedResults = await saveScrapedVideos({
              currentDateTime,
              originalVideos: scrapedVideos,
              supabaseClient,
              talentId: talentInfo.id,
              youtubeChannelId: talentInfo.youtubeChannelId,
            })
            videos.push(...savedResults)
          } catch (err) {
            Sentry.captureException(err)
          }
        },
      )
    }
  } else {
    const { data: savedTalents, error } = await supabaseClient
      .from('talents')
      .select('id, twitch_users!inner(id, twitch_user_id)')
      .eq('status', 'active')
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

    const userToTalentMap = new Map<
      string,
      {
        talentId: string
        twitchUserRowId: string
      }
    >()

    for (const savedTalent of savedTalents) {
      for (const twitchUser of savedTalent.twitch_users) {
        userToTalentMap.set(twitchUser.twitch_user_id, {
          talentId: savedTalent.id,
          twitchUserRowId: twitchUser.id,
        })
      }
    }

    const helixUserIds = Array.from(userToTalentMap.keys())

    if (helixUserIds.length > 0) {
      await using scraper = new TwitchScraper({ concurrency: 2 })

      // First page of archives per user — enough for frequent discovery.
      await scraper.scrapeNewVideos(
        { type: 'archive', userIds: helixUserIds },
        async (helixUserId, scrapedVideos) => {
          const talentInfo = userToTalentMap.get(helixUserId)
          if (!talentInfo) {
            logger.warn('タレント情報が見つかりませんでした', {
              twitchUserId: helixUserId,
            })
            return
          }

          try {
            const savedResults = await saveTwitchVideos({
              currentDateTime,
              originalVideos: scrapedVideos,
              supabaseClient,
              talentId: talentInfo.talentId,
              twitchUserId: talentInfo.twitchUserRowId,
            })
            videos.push(...savedResults)
          } catch (err) {
            Sentry.captureException(err)
          }
        },
      )
    }
  }

  if (videos.length > 0) {
    for (const video of videos) {
      const publishedAt = Temporal.Instant.from(video.published_at)
      const platformVideoId =
        video.youtube_video?.youtube_video_id ??
        video.twitch_video?.twitch_video_id

      Sentry.logger.info('The video has been saved.', {
        duration: video.duration,
        id: platformVideoId,
        provider,
        publishedAt: publishedAt.toString(),
        title: video.title,
      })
    }

    await revalidateTags(['videos'], {
      signal: request.signal,
    })
  } else {
    Sentry.logger.info('No updated channels existed.', { provider })
  }

  // Shared across providers: admin "last video sync" is platform-agnostic.
  await redisClient.set(REDIS_KEYS.LAST_VIDEO_SYNC, currentDateTime.toString())

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
