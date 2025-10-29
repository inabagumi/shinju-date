import { createErrorResponse } from '@shinju-date/helpers'
import { startOfHour } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import {
  createCalendarResponse,
  createEventAttributesList,
} from '@/lib/calendar'
import { timeZone } from '@/lib/constants'
import { supabaseClient } from '@/lib/supabase'

export async function GET(
  _req: Request,
  {
    params,
  }: Readonly<{
    params: Promise<{
      slug: string
    }>
  }>,
): Promise<Response> {
  const { slug } = await params
  const { count, error } = await supabaseClient
    .from('channels')
    .select('*, youtube_channels(youtube_channel_id)', {
      count: 'exact',
      head: true,
    })
    .eq('slug', slug)

  if (error) {
    return createErrorResponse(error.message, {
      status: 500,
    })
  }

  if (!count || count < 1) {
    return createErrorResponse('Not Found', {
      status: 404,
    })
  }

  const now = startOfHour(Temporal.Now.zonedDateTimeISO(timeZone))
  const { data: videos, error: secondError } = await supabaseClient
    .from('videos')
    .select(
      `
        channel:channels!inner (
          name,
          slug
        ),
        duration,
        published_at,
        slug,
        title,
        youtube_videos (youtube_video_id)
      `,
    )
    .eq('channels.slug', slug)
    .lt(
      'published_at',
      now
        .add({
          days: 7,
        })
        .toInstant()
        .toJSON(),
    )
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (secondError) {
    return createErrorResponse(secondError.message, {
      status: 500,
    })
  }

  const events = createEventAttributesList(videos, {
    now,
  })

  return createCalendarResponse(events)
}
