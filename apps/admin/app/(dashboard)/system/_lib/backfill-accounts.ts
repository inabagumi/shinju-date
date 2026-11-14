import {
  type BackfillRunRequest,
  getBackfillJobId,
} from '@shinju-date/video-backfill'
import type { TypedSupabaseClient } from '@/lib/supabase'

/** A YouTube channel or Twitch account that can be backfilled. */
export interface BackfillAccount extends BackfillRunRequest {
  name: string
  talentName: string
}

export interface BackfillAccounts {
  /** Accounts of talents that are not deleted, by job ID. */
  all: Map<string, BackfillAccount>
  /** Accounts of active talents. */
  targets: BackfillAccount[]
}

/**
 * Loads the YouTube channels and Twitch accounts of the talents that are not
 * deleted. Retired talents are included only to name the accounts of
 * earlier backfills; the targets of a check are the accounts of active
 * talents.
 */
export async function getBackfillAccounts(
  supabaseClient: TypedSupabaseClient,
): Promise<BackfillAccounts> {
  const { data, error } = await supabaseClient
    .from('talents')
    .select(
      'id, name, status, youtube_channels(id, name, youtube_channel_id), twitch_users(id, name, twitch_login_name, twitch_user_id)',
    )
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  const all = new Map<string, BackfillAccount>()
  const targets: BackfillAccount[] = []

  for (const talent of data) {
    const accounts: BackfillAccount[] = [
      ...talent.youtube_channels.map((channel) => ({
        accountId: channel.id,
        name: channel.name ?? channel.youtube_channel_id,
        provider: 'youtube' as const,
        talentId: talent.id,
        talentName: talent.name,
      })),
      ...talent.twitch_users.map((user) => ({
        accountId: user.id,
        name: user.name ?? user.twitch_login_name ?? user.twitch_user_id,
        provider: 'twitch' as const,
        talentId: talent.id,
        talentName: talent.name,
      })),
    ]

    for (const account of accounts) {
      all.set(getBackfillJobId(account.provider, account.accountId), account)
    }

    if (talent.status === 'active') {
      targets.push(...accounts)
    }
  }

  return { all, targets }
}
