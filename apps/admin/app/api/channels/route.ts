import { NextResponse } from 'next/server'
import { createErrorResponse } from '@/lib/session'
import { createSupabaseClient } from '@/lib/supabase'

export async function GET(): Promise<NextResponse> {
  const supabaseClient = createSupabaseClient()
  const { data: rawChannels, error } = await supabaseClient
    .from('channels')
    .select('name, slug, url')
    .is('deleted_at', null)

  if (error) {
    return createErrorResponse(500, error.message)
  }

  const channels = rawChannels.map((channel) => ({
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
