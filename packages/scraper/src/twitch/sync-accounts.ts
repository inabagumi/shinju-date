import { countChanges } from '../internal/concurrency.js'
import { DatabaseError } from '../internal/database/index.js'
import type { CrawlContext } from '../types.js'
import type { TwitchFetcher } from './fetcher.js'
import {
  type SavedTwitchUserIcon,
  syncTwitchUserIcon,
} from './profile-image.js'
import type { TwitchUser } from './types.js'

const UPDATE_CONCURRENCY = 8

interface SavedTwitchUser extends SavedTwitchUserIcon {
  name: string | null
  twitch_login_name: string | null
}

/**
 * Updates the display name and login of a saved user.
 *
 * @returns Whether anything was written.
 * @throws When the user cannot be updated.
 */
async function syncDetails(
  { logger, supabaseClient }: CrawlContext<TwitchFetcher>,
  user: TwitchUser,
  saved: SavedTwitchUser,
): Promise<boolean> {
  if (
    saved.name === user.display_name &&
    saved.twitch_login_name === user.login
  ) {
    return false
  }

  const { error } = await supabaseClient
    .from('twitch_users')
    .update({ name: user.display_name, twitch_login_name: user.login })
    .eq('id', saved.id)

  if (error) {
    throw new DatabaseError('Failed to update a Twitch user', error)
  }

  logger.info('Twitchユーザーの情報を更新しました', {
    login: `${saved.twitch_login_name} -> ${user.login}`,
    name: `${saved.name} -> ${user.display_name}`,
    twitchUserId: user.id,
  })

  return true
}

/**
 * Updates the stored icon of a saved user.
 *
 * A failure is reported instead of thrown, so that an icon that cannot be
 * stored never keeps the display name and login from being synced.
 *
 * @returns Whether anything was written.
 */
async function syncIcon(
  { logger, now, reportError, supabaseClient }: CrawlContext<TwitchFetcher>,
  user: TwitchUser,
  saved: SavedTwitchUser,
): Promise<boolean> {
  try {
    const result = await syncTwitchUserIcon({
      now,
      saved,
      supabaseClient,
      user,
    })

    if (result === 'unchanged') {
      return false
    }

    logger.info('Twitchユーザーのアイコンを更新しました', {
      result,
      twitchUserId: user.id,
    })

    return true
  } catch (error) {
    reportError(error, {
      operation: 'syncProfileImage',
      twitchUserId: user.id,
    })

    return false
  }
}

/**
 * Brings the display name, login and icon of saved Twitch accounts in line
 * with Twitch. Accounts of retired talents are included (deleted talents are
 * not).
 *
 * The details and the icon are synced independently: either one failing is
 * reported and does not keep the other from being synced. Icons that are no
 * longer used are deleted by the YouTube sync, which cleans up icons of every
 * platform.
 *
 * @returns The number of accounts updated.
 */
export async function syncTwitchUsers(
  context: CrawlContext<TwitchFetcher>,
): Promise<number> {
  const { fetcher, reportError, supabaseClient } = context
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, twitch_users!inner(id, name, twitch_login_name, twitch_user_id, profile_images(id, path, etag, source_url))',
    )
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load Twitch users', error)
  }

  const savedUsers: SavedTwitchUser[] = talents.flatMap(
    (talent) => talent.twitch_users,
  )
  const savedByTwitchId = new Map(
    savedUsers.map((saved) => [saved.twitch_user_id, saved]),
  )
  const users = await fetcher.getAccounts([...savedByTwitchId.keys()])

  return countChanges(
    users,
    UPDATE_CONCURRENCY,
    async (user) => {
      const saved = savedByTwitchId.get(user.id)

      if (!saved) {
        return false
      }

      let detailsChanged = false

      try {
        detailsChanged = await syncDetails(context, user, saved)
      } catch (detailsError) {
        reportError(detailsError, { twitchUserId: user.id })
      }

      const iconChanged = await syncIcon(context, user, saved)

      return detailsChanged || iconChanged
    },
    (error, user) => reportError(error, { twitchUserId: user.id }),
  )
}
