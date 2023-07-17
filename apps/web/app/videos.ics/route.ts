import { Temporal } from '@js-temporal/polyfill'
import { NextResponse } from 'next/server'
import {
  createCalendarResponse,
  createEventAttributesList
} from '@/lib/calendar'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-static'
export const revalidate = 60

export async function GET(): Promise<NextResponse> {
  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const { data: videos, error } = await supabase
    .from('videos')
    .select('channels (name), duration, published_at, slug, title, url')
    .lt('published_at', now.add({ days: 7 }).toInstant().toString())
    .order('published_at', { ascending: false })
    .limit(100)

  if (error) {
    return new NextResponse(error.message, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  const events = createEventAttributesList(videos, { now })

  return createCalendarResponse(events)
}
