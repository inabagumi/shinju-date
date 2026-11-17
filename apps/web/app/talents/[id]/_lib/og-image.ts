import { SITE_THEME_COLOR } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'
import sharp from 'sharp'
import type { ProfileImage } from '@/lib/fetchers'
import { getSupabaseAdminClient, supabaseClient } from '@/lib/supabase'
import { parseThemeColor } from '@/lib/theme-color'

/**
 * The color of the band of a talent's Open Graph image: the theme color of
 * the talent, or the site's when it is not set or is not a `#rrggbb` color.
 * Theme colors are entered by hand, so they are checked before they are drawn.
 */
export function getTalentThemeColor(
  themeColor: string | null | undefined,
): string {
  return parseThemeColor(themeColor) ?? SITE_THEME_COLOR
}

/**
 * The icon of a talent as a data URL of a `size`×`size` PNG.
 *
 * The icons are stored as WebP, which `ImageResponse` cannot draw, so it is
 * converted here. `null` means a placeholder should be drawn instead: for a
 * talent without an icon, and when the icon cannot be fetched or converted,
 * which only logs the error so the image is still generated.
 */
export async function fetchTalentIconDataURL(
  profileImage: ProfileImage | null,
  size: number,
): Promise<string | null> {
  if (!profileImage) {
    return null
  }

  try {
    // Looked up with the public key, so RLS decides which icons may be used,
    // as in `/images/profile-images/[id]`. Only the download needs the
    // service role.
    const { data: row, error } = await supabaseClient
      .from('profile_images')
      .select('path')
      .eq('id', profileImage.id)
      .maybeSingle()

    if (error) {
      throw new TypeError(error.message, { cause: error })
    }

    if (!row) {
      return null
    }

    const { data: blob, error: downloadError } = await getSupabaseAdminClient()
      .storage.from('profile-images')
      .download(row.path)

    if (downloadError) {
      throw downloadError
    }

    const png = await sharp(Buffer.from(await blob.arrayBuffer()))
      .resize(size, size, { fit: 'cover' })
      .png()
      .toBuffer()

    return `data:image/png;base64,${png.toString('base64')}`
  } catch (error) {
    logger.warn(
      'Failed to load the icon of a talent for its Open Graph image',
      {
        error,
        profileImageId: profileImage.id,
      },
    )

    return null
  }
}
