import { Temporal } from '@js-temporal/polyfill'
import {
  createCalendarResponse,
  createEventAttributesList
} from '@/lib/calendar'
import { supabaseClient } from '@/lib/supabase'

export const dynamic = 'force-static'
export const revalidate = 60

export async function GET(): Promise<Response> {
  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const { data: videos, error } = await supabaseClient
    .from('videos')
    .select('channels (name), duration, published_at, slug, title, url')
    .lt('published_at', now.add({ days: 7 }).toInstant().toString())
    .order('published_at', { ascending: false })
    .limit(100)

  if (error) {
    return new Response(error.message, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  const events = createEventAttributesList(videos, { now })

  return createCalendarResponse(events)
}
