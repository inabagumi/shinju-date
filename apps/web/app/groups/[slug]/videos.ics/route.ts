import { Temporal } from '@js-temporal/polyfill'
import { type NextRequest, NextResponse } from 'next/server'
import {
  createCalendarResponse,
  createEventAttributesList,
  createNotFoundResponse
} from '@/lib/calendar'
import { supabase } from '@/lib/supabase'

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
  const { count, error } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('slug', params.slug)

  if (error) {
    return new NextResponse(error.message, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  if (!count || count < 1) {
    return createNotFoundResponse()
  }

  const timeZone = Temporal.TimeZone.from('UTC')
  const now = Temporal.Now.zonedDateTimeISO(timeZone)
  const { data: videos, error: secondError } = await supabase
    .from('videos')
    .select(
      `
        channels!inner (
          groups!inner (
            slug
          ),
          name
        ),
        duration,
        published_at,
        slug,
        title,
        url
      `
    )
    .eq('channels.groups.slug', params.slug)
    .lt('published_at', now.add({ days: 7 }).toInstant().toJSON())
    .order('published_at', { ascending: false })
    .limit(100)

  if (secondError) {
    return new NextResponse(secondError.message, {
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      },
      status: 500
    })
  }

  const events = createEventAttributesList(videos, { now })

  return createCalendarResponse(events)
}
