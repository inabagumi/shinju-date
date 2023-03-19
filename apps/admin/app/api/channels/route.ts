import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'

export async function GET(): Promise<NextResponse> {
  const supabaseClient = createSupabaseClient()
  const { data, error } = await supabaseClient
    .from('channels')
    .select('name, slug, url')
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(500, error.message)
  }

  if (!data) {
    return createErrorResponse(404, '404 Not Found.')
  }

  const channels = data.map((channel) => ({
    id: channel.slug,
    name: channel.name,
    url: channel.url
  }))

  return NextResponse.json(channels, {
    headers: {
      'Cache-Control': 'max-age=60'
    }
  })
}
