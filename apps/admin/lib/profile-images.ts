import { PROFILE_IMAGES_BUCKET } from '@shinju-date/constants'
import { logger } from '@shinju-date/logger'

/**
 * Removes the stored objects of profile images whose rows are already gone.
 *
 * Deleting a YouTube channel or Twitch user deletes its `profile_images` row
 * (`ON DELETE CASCADE`), but objects in Storage cannot be removed from SQL.
 * Call this after the account has been deleted, with the paths read before.
 *
 * Best effort: an object without a row is never served, so a failure is only
 * logged.
 */
export async function removeProfileImageObjects(
  paths: (string | null | undefined)[],
): Promise<void> {
  const targets = paths.filter((path): path is string => Boolean(path))

  if (targets.length === 0) {
    return
  }

  try {
    // The bucket is private: only the service role may remove objects.
    const { supabaseClient } = await import('@/lib/supabase/admin')
    const { error } = await supabaseClient.storage
      .from(PROFILE_IMAGES_BUCKET)
      .remove(targets)

    if (error) {
      throw error
    }
  } catch (error) {
    logger.warn('プロフィール画像の削除に失敗しました', {
      error,
      paths: targets,
    })
  }
}
