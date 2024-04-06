import { type Tables } from '@shinju-date/database'
import { createErrorResponse, verifyCronRequest } from '@shinju-date/helpers'
import { defaultLogger as logger } from '@shinju-date/logging'
import { createSupabaseClient } from '@shinju-date/supabase'
import { Temporal } from 'temporal-polyfill'
import { channelsUpdate as ratelimit } from '@/lib/ratelimit'
import { revalidateTags } from '@/lib/revalidate'
import { captureException } from '@/lib/sentry'
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

  const currentDateTime = Temporal.Now.instant()
  const supabaseClient = createSupabaseClient(
    undefined,
    process.env['SUPABASE_SERVICE_ROLE_KEY']
  )
  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('name, slug')
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(error.message, { status: 500 })
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
      const channel = channels.find((channel) => channel.slug === channelID)

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

  return new Response(null, {
    status: 204
  })
}

export const GET = POST
