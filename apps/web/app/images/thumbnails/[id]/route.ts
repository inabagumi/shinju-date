import { createErrorResponse } from '@shinju-date/helpers'
import type { NextRequest } from 'next/server'
import { proxyStorageImage } from '@/lib/storage-image'
import { createSupabaseClient } from '@/lib/supabase'

const supabaseAdminClient = createSupabaseClient(
  undefined,
  process.env['SUPABASE_SERVICE_ROLE_KEY'],
)

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/images/thumbnails/[id]'>,
) {
  const { id } = await ctx.params
  const { data: thumbnail, error } = await supabaseAdminClient
    .from('thumbnails')
    .select('path')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (error || !thumbnail) {
    return createErrorResponse('Failed to fetch thumbnail', { status: 404 })
  }

  return proxyStorageImage({
    bucket: 'thumbnails',
    path: thumbnail.path,
    request,
    storageClient: supabaseAdminClient,
  })
}
