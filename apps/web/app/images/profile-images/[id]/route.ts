import { createErrorResponse } from '@shinju-date/helpers'
import type { NextRequest } from 'next/server'
import { serveStorageImage } from '@/lib/storage-image'
import { createSupabaseClient, supabaseClient } from '@/lib/supabase'

const supabaseAdminClient = createSupabaseClient(
  undefined,
  process.env['SUPABASE_SERVICE_ROLE_KEY'],
)

/**
 * Serves the icon of a YouTube channel or Twitch user.
 *
 * Icons without an owner (replaced ones awaiting clean-up, or icons of
 * deleted talents) are answered with 404, so callers should show the default
 * icon when a channel or user has no `profile_image_id`.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/images/profile-images/[id]'>,
) {
  const { id } = await ctx.params
  // Looked up with the public key, so RLS decides which icons may be served.
  // Only signing the URL needs the service role.
  const { data: profileImage, error } = await supabaseClient
    .from('profile_images')
    .select('path')
    .eq('id', id)
    .maybeSingle()

  if (error || !profileImage) {
    return createErrorResponse('Failed to fetch profile image', {
      status: 404,
    })
  }

  return serveStorageImage(request, {
    bucket: 'profile-images',
    path: profileImage.path,
    supabaseClient: supabaseAdminClient,
  })
}
