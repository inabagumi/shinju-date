import { type Database } from '@shinju-date/schema'
import dedent from 'dedent'
import { NextResponse } from 'next/server'
import { redisClient } from '@/lib/redis'
import { createErrorResponse } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'
import { youtubeClient } from '@/lib/youtube'

const TWO_HOURS = 60 * 60 * 2

async function isDuplicate(key: string) {
  const response = await redisClient.set(key, true, {
    ex: TWO_HOURS,
    nx: true
  })

  return !response
}

type Channel = Pick<
  Database['public']['Tables']['channels']['Row'],
  'name' | 'slug' | 'url'
>

export async function POST(): Promise<NextResponse> {
  if (await isDuplicate('cron:channels:update')) {
    return createErrorResponse(
      429,
      'There has been no interval since the last run.'
    )
  }

  const supabaseClient = createSupabaseClient({
    token: process.env.SUPABASE_SERVICE_ROLE_KEY
  })
  const { data: channels, error } = await supabaseClient
    .from('channels')
    .select('name, slug, url')
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(500, error.message)
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

      const channelURL = item.snippet.customUrl
        ? `https://www.youtube.com/${item.snippet.customUrl}`
        : `https://www.youtube.com/channels/${item.id}`

      if (item.snippet.title === channel.name && channelURL === channel.url) {
        return null
      }

      const { data, error } = await supabaseClient
        .from('channels')
        .update({
          name: item.snippet.title,
          url: channelURL
        })
        .eq('slug', item.id)
        .select('name, slug, url')
        .single()

      if (error) {
        throw error
      }

      return data
    })
  )

  for (const result of results) {
    switch (result.status) {
      case 'fulfilled':
        if (result.value) {
          const channelID = result.value.slug

          const channel = channels.find((channel) => channel.slug === channelID)

          if (channel) {
            console.log(
              dedent`
                channelID: ${channelID}
                name: ${channel.name} -> ${result.value.name}
                url: ${channel.url} -> ${result.value.url}
              `
            )
          }
        }

        break
      case 'rejected':
        console.error(result.reason)

        break

      default:
        console.error('An undefined status was returned.')

        break
    }
  }

  return new NextResponse(null, {
    status: 204
  })
}

export const GET = POST
