import { Temporal } from '@js-temporal/polyfill'
import { type EventAttributes } from 'ics'
import { type NextRequest, NextResponse } from 'next/server'
import { getVideosByChannelIDs } from '@/lib/algolia'
import {
  createCalendarResponse,
  createEventAttributesList,
  createNotFoundResponse
} from '@/lib/calendar'
import { getChannelsByGroup, getGroupBySlug } from '@/lib/supabase'

export const runtime = 'edge'
export const dynamic = 'force-static'
export const revalidate = 60

type Params = {
  slug: string
}

type Props = {
  params: Params
}

export async function GET(
  _req: NextRequest,
  { params }: Props
): Promise<NextResponse> {
  const group = await getGroupBySlug(params.slug)

  if (!group) {
    return createNotFoundResponse()
  }

  const channels = getChannelsByGroup(group)

  const events: EventAttributes[] = []

  if (channels.length > 0) {
    const timeZone = Temporal.TimeZone.from('UTC')
    const now = Temporal.Now.zonedDateTimeISO(timeZone)
    const videos = await getVideosByChannelIDs(
      channels.map((channel) => channel.slug),
      {
        filters: [`publishedAt < ${now.add({ days: 7 }).epochSeconds}`],
        limit: 100
      }
    )
    events.push(...createEventAttributesList(videos, { now }))
  }

  return createCalendarResponse(events)
}
