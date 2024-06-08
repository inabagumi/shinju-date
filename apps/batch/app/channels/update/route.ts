import * as Sentry from '@sentry/nextjs'
import { type Tables } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { defaultLogger as logger } from '@shinju-date/logging'
import { Temporal } from 'temporal-polyfill'
import { channelsUpdate as ratelimit } from '@/lib/ratelimit'
import { revalidateTags } from '@/lib/revalidate'
import { captureException } from '@/lib/sentry'
import { supabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

export const runtime = 'nodejs'
export const revalidate = 0
export const maxDuration = 120

type Channel = Pick<Tables<'channels'>, 'name' | 'slug'>

export async function POST(request: Request): Promise<Response> {
  const cronSecure = process.env['CRON_SECRET']
  if (cronSecure && !verifyCronRequest(request, { cronSecure })) {
    return createErrorResponse('Unauthorized', { status: 401 })
  }

  const { success } = await ratelimit.limit('channels:update')

  if (!success) {
    return createErrorResponse(
      'There has been no interval since the last run.',
      { status: 429 }
    )
  }

  try {
    await Sentry.withMonitor(
      '/channels/update',
      async () => {
        const currentDateTime = Temporal.Now.instant()
        const { data: channels, error } = await supabaseClient
          .from('channels')
          .select('name, slug')
          .is('deleted_at', null)

        if (error) {
          throw new TypeError(error.message, { cause: error })
        }

        const {
          data: { items = [] }
        } = await youtubeClient.channels.list({
          id: channels.map((channel) => channel.slug),
          maxResults: channels.length,
          part: ['snippet']
        })

        const results = await Promise.allSettled(
          items.map<Promise<Channel | null>>(async (item) => {
            if (!item.id) {
              throw new TypeError('The ID not found.')
            }

            const channel = channels.find((channel) => channel.slug === item.id)

            if (!channel) {
              throw new TypeError('A channel does not exist.')
            }

            if (!item.snippet || !item.snippet.title) {
              throw new TypeError('A snippet is empty.')
            }

            if (item.snippet.title === channel.name) {
              return null
            }

            const { data, error } = await supabaseClient
              .from('channels')
              .update({
                name: item.snippet.title,
                updated_at: currentDateTime.toJSON()
              })
              .eq('slug', item.id)
              .select('name, slug')
              .single()

            if (error) {
              throw new TypeError(error.message, { cause: error })
            }

            return data
          })
        )

        let isUpdated = false

        for (const result of results) {
          if (result.status === 'fulfilled' && result.value) {
            const newChannel = result.value
            const channelID = newChannel.slug
            const channel = channels.find(
              (channel) => channel.slug === channelID
            )

            if (!channel) {
              continue
            }

            const changedColumns: Partial<typeof channel> = {}

            if (channel.name !== newChannel.name) {
              changedColumns.name = `${channel.name} -> ${newChannel.name}`
            }

            logger.info('Channel information has been updated.', changedColumns)

            if (!isUpdated) {
              isUpdated = true
            }
          } else if (result.status === 'rejected') {
            captureException(result.reason)
          }
        }

        if (isUpdated) {
          await revalidateTags(['channels'], {
            signal: request.signal
          })
        }
      },
      {
        schedule: {
          type: 'crontab',
          value: '21 1/3 * * *'
        },
        timezone: 'Etc/UTC'
      }
    )
  } catch (error) {
    captureException(error)

    // wait for logging
    await new Promise((resolve) => {
      setTimeout(resolve, 2_000)
    })

    const message =
      error instanceof Error ? error.message : 'Internal Server Error'

    return createErrorResponse(message, { status: 500 })
  }

  // wait for logging
  await new Promise((resolve) => {
    setTimeout(resolve, 2_000)
  })

  return new Response(null, {
    status: 204
  })
}

export const GET = POST
