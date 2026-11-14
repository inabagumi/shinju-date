import { countChanges } from '../internal/concurrency.js'
import { DatabaseError } from '../internal/database/index.js'
import type { CrawlContext } from '../types.js'
import type { TwitchFetcher } from './fetcher.js'

const UPDATE_CONCURRENCY = 8

/**
 * Brings the display name and login of saved Twitch accounts in line with
 * Twitch. Accounts of retired talents are included (deleted talents are not).
 *
 * @returns The number of accounts updated.
 */
export async function syncTwitchUsers({
  fetcher,
  logger,
  reportError,
  supabaseClient,
}: CrawlContext<TwitchFetcher>): Promise<number> {
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, twitch_users!inner(id, name, twitch_login_name, twitch_user_id)',
    )
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load Twitch users', error)
  }

  const savedUsers = talents.flatMap((talent) => talent.twitch_users)
  const savedByTwitchId = new Map(
    savedUsers.map((saved) => [saved.twitch_user_id, saved]),
  )
  const users = await fetcher.getAccounts([...savedByTwitchId.keys()])

  return countChanges(
    users,
    UPDATE_CONCURRENCY,
    async (user) => {
      const saved = savedByTwitchId.get(user.id)

      if (
        !saved ||
        (saved.name === user.display_name &&
          saved.twitch_login_name === user.login)
      ) {
        return false
      }

      const { error: updateError } = await supabaseClient
        .from('twitch_users')
        .update({ name: user.display_name, twitch_login_name: user.login })
        .eq('id', saved.id)

      if (updateError) {
        throw new DatabaseError('Failed to update a Twitch user', updateError)
      }

      logger.info('Twitchユーザーの情報を更新しました', {
        login: `${saved.twitch_login_name} -> ${user.login}`,
        name: `${saved.name} -> ${user.display_name}`,
        twitchUserId: user.id,
      })

      return true
    },
    (error, user) => reportError(error, { twitchUserId: user.id }),
  )
}
