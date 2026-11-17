import type { Tables } from '@shinju-date/database'
import { diffAccountFields } from '../internal/account-fields.js'
import { countChanges } from '../internal/concurrency.js'
import { DatabaseError } from '../internal/database/index.js'
import type {
  AccountChanges,
  CrawlContext,
  SyncAccountResult,
  TypedSupabaseClient,
} from '../types.js'
import type { TwitchFetcher } from './fetcher.js'
import {
  type SavedTwitchUserIcon,
  syncTwitchUserIcon,
} from './profile-image.js'
import type { TwitchUser } from './types.js'

const UPDATE_CONCURRENCY = 8

/** The columns of a user that are kept in line with Twitch. */
export type TwitchUserFields = Pick<
  Tables<'twitch_users'>,
  'name' | 'twitch_login_name'
>

interface SavedTwitchUser extends SavedTwitchUserIcon, TwitchUserFields {}

/** What syncing one user wrote. */
interface UserSyncOutcome {
  changes: AccountChanges<TwitchUserFields> | undefined
  /** Whether the display name and login could not be written. */
  detailsFailed: boolean
  iconUpdated: boolean
}

/**
 * Loads the saved users of non-deleted talents (retired ones included), or of
 * one talent only.
 *
 * @throws When the users cannot be loaded.
 */
async function loadSavedUsers(
  supabaseClient: TypedSupabaseClient,
  talentId?: string,
): Promise<SavedTwitchUser[]> {
  let query = supabaseClient
    .from('talents')
    .select(
      'id, twitch_users!inner(id, name, twitch_login_name, twitch_user_id, profile_images(id, path, etag, source_url))',
    )
    .is('deleted_at', null)

  if (talentId !== undefined) {
    query = query.eq('id', talentId)
  }

  const { data: talents, error } = await query

  if (error) {
    throw new DatabaseError('Failed to load Twitch users', error)
  }

  return talents.flatMap((talent) => talent.twitch_users)
}

/**
 * Updates the display name and login of a saved user.
 *
 * @returns The columns that changed, or `undefined` when nothing was written.
 * @throws When the user cannot be updated.
 */
async function syncDetails(
  { logger, supabaseClient }: CrawlContext<TwitchFetcher>,
  user: TwitchUser,
  saved: SavedTwitchUser,
): Promise<AccountChanges<TwitchUserFields> | undefined> {
  const changes = diffAccountFields<TwitchUserFields>(
    { name: saved.name, twitch_login_name: saved.twitch_login_name },
    { name: user.display_name, twitch_login_name: user.login },
  )

  if (!changes) {
    return undefined
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

  return changes
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
 * Syncs the display name and login of a saved user, then its icon. The two
 * are independent: a failure to write the display name and login is reported
 * and does not keep the icon from being synced.
 */
async function syncUser(
  context: CrawlContext<TwitchFetcher>,
  user: TwitchUser,
  saved: SavedTwitchUser,
): Promise<UserSyncOutcome> {
  let changes: AccountChanges<TwitchUserFields> | undefined
  let detailsFailed = false

  try {
    changes = await syncDetails(context, user, saved)
  } catch (detailsError) {
    context.reportError(detailsError, { twitchUserId: user.id })
    detailsFailed = true
  }

  const iconUpdated = await syncIcon(context, user, saved)

  return { changes, detailsFailed, iconUpdated }
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
  const savedUsers = await loadSavedUsers(supabaseClient)
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

      const { changes, iconUpdated } = await syncUser(context, user, saved)

      return changes !== undefined || iconUpdated
    },
    (error, user) => reportError(error, { twitchUserId: user.id }),
  )
}

/**
 * Brings the display name, login and icon of the Twitch accounts of one
 * talent in line with Twitch, with the same functions as
 * {@link syncTwitchUsers}: an account is written only when something changed.
 *
 * @returns One result per saved account of the talent; empty when the talent
 *   has none or was deleted.
 * @throws When the accounts cannot be loaded or Twitch cannot be read.
 */
export async function syncTwitchUsersOfTalent(
  context: CrawlContext<TwitchFetcher>,
  talentId: string,
): Promise<SyncAccountResult<TwitchUserFields>[]> {
  const { fetcher, supabaseClient } = context
  const savedUsers = await loadSavedUsers(supabaseClient, talentId)

  if (savedUsers.length === 0) {
    return []
  }

  const users = await fetcher.getAccounts(
    savedUsers.map((saved) => saved.twitch_user_id),
  )
  const userById = new Map(users.map((user) => [user.id, user]))

  return Promise.all(
    savedUsers.map(
      async (saved): Promise<SyncAccountResult<TwitchUserFields>> => {
        const user = userById.get(saved.twitch_user_id)

        if (!user) {
          return {
            accountId: saved.id,
            iconUpdated: false,
            name: saved.name,
            status: 'not-found',
          }
        }

        const { changes, detailsFailed, iconUpdated } = await syncUser(
          context,
          user,
          saved,
        )

        if (detailsFailed) {
          return {
            accountId: saved.id,
            iconUpdated,
            name: saved.name,
            status: 'failed',
          }
        }

        return {
          accountId: saved.id,
          iconUpdated,
          name: user.display_name,
          status: changes || iconUpdated ? 'updated' : 'unchanged',
          ...(changes ? { changes } : {}),
        }
      },
    ),
  )
}
