import { PROFILE_IMAGES_BUCKET } from '@shinju-date/constants'
import { createErrorResponse } from '@shinju-date/helpers'
import type { NextRequest } from 'next/server'
import { proxyStorageImage } from '@/lib/storage-image'
import { createSupabaseClient, supabaseClient } from '@/lib/supabase'

const supabaseAdminClient = createSupabaseClient(
  undefined,
  process.env['SUPABASE_SERVICE_ROLE_KEY'],
)

/**
 * Serves the icon of a YouTube channel or Twitch user.
 *
 * The row is read with the public (anon) client so that row level security
 * decides which icons may be shown (only those of active talents). The
 * service role is used only to sign the URL of the private object.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/images/profile-images/[id]'>,
) {
  const { id } = await ctx.params
  const { data: image, error } = await supabaseClient
    .from('profile_images')
    .select('path')
    .eq('id', id)
    .maybeSingle()

  if (error || !image) {
    return createErrorResponse('Failed to fetch profile image', {
      status: 404,
    })
  }

  return proxyStorageImage({
    bucket: PROFILE_IMAGES_BUCKET,
    path: image.path,
    request,
    storageClient: supabaseAdminClient,
  })
}
