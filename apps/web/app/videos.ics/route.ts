import { TIME_ZONE } from '@shinju-date/constants'
import { createErrorResponse } from '@shinju-date/helpers'
import { startOfHour } from '@shinju-date/temporal-fns'
import { Temporal } from 'temporal-polyfill'
import {
  createCalendarResponse,
  createEventAttributesList,
} from '@/lib/calendar'
import { supabaseClient } from '@/lib/supabase'

export async function GET(): Promise<Response> {
  const now = startOfHour(Temporal.Now.zonedDateTimeISO(TIME_ZONE))
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select(
      `
        talent:talents!inner (
          name
        ),
        duration,
        id,
        platform,
        published_at,
        status,
        title,
        youtube_video:youtube_videos (youtube_video_id),
        twitch_video:twitch_videos (
          twitch_video_id,
          type,
          twitch_user:twitch_users (twitch_login_name)
        )
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
