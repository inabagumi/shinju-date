import { createErrorResponse } from '@shinju-date/helpers'
import { startOfHour } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import {
  createCalendarResponse,
  createEventAttributesList,
} from '@/lib/calendar'
import { timeZone } from '@/lib/constants'
import { supabaseClient } from '@/lib/supabase'

export async function GET(): Promise<Response> {
  const now = startOfHour(Temporal.Now.zonedDateTimeISO(timeZone))
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(
      `
        channel:channels!inner (
          name
        ),
        duration,
        id,
        published_at,
        title,
        youtube_video:youtube_videos!inner (youtube_video_id)
      `,
    )
    .lt(
      'published_at',
      now
        .add({
          days: 7,
        })
        .toInstant()
        .toString(),
    )
    .order('published_at', {
      ascending: false,
    })
    .limit(100)

  if (error) {
    return createErrorResponse(error.message, {
      status: 500,
    })
  }

  const events = createEventAttributesList(videos, {
    now,
  })

  return createCalendarResponse(events)
}
