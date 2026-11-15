import { createErrorResponse } from '@shinju-date/helpers'
import { supabaseClient } from '@/lib/supabase'
import { createVideosCalendarResponse } from '@/lib/videos-calendar'

export async function GET(
  _req: Request,
  {
    params,
  }: Readonly<{
    params: Promise<{
      id: string
    }>
  }>,
): Promise<Response> {
  const { id } = await params
  const { count, error } = await supabaseClient
    .from('talents')
    .select('*', {
      count: 'exact',
      head: true,
    })
    .eq('id', id)

  if (error) {
    return createErrorResponse(error.message, {
      status: 500,
    })
  }

  if (!count || count < 1) {
    return createErrorResponse('Not Found', {
      status: 404,
    })
  }

  return createVideosCalendarResponse({
    talentIds: [id],
  })
}
