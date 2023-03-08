import { type NextRequest, NextResponse } from 'next/server'
import { getVideosByChannelIDs } from '@/lib/algolia'
import {
  createCalendarResponse,
  createEventAttributesList,
  createNotFoundResponse
} from '@/lib/calendar'
import { getChannelBySlug } from '@/lib/supabase'

export const runtime = 'edge'
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
  const channel = await getChannelBySlug(params.slug)

  if (!channel) {
    return createNotFoundResponse()
  }

  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const videos = await getVideosByChannelIDs([channel.slug], {
    filters: [`publishedAt < ${now.add({ days: 7 }).epochSeconds}`],
    limit: 100
  })
  const events = createEventAttributesList(videos, { now })

  return createCalendarResponse(events)
}
