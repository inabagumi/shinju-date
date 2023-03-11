import { Temporal } from '@js-temporal/polyfill'
import { NextResponse } from 'next/server'
import { getVideosByChannelIDs } from '@/lib/algolia'
import {
  createCalendarResponse,
  createEventAttributesList
} from '@/lib/calendar'

export const runtime = 'edge'
export const dynamic = 'force-static'
export const revalidate = 60

export async function GET(): Promise<NextResponse> {
  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const videos = await getVideosByChannelIDs([], {
    filters: [`publishedAt < ${now.add({ days: 7 }).epochSeconds}`],
    limit: 100
  })
  const events = createEventAttributesList(videos, { now })

  return createCalendarResponse(events)
}
