import type { TypedSupabaseClient } from '../../types.js'
import { DatabaseError } from './errors.js'

/** A YouTube channel owned by an active talent. */
export interface ActiveYouTubeChannel {
  /** Primary key of the `youtube_channels` row */
  id: string
  talentId: string
  /** YouTube channel ID (`UC...`) */
  youtubeChannelId: string
}

/** A Twitch account owned by an active talent. */
export interface ActiveTwitchUser {
  /** Primary key of the `twitch_users` row */
  id: string
  talentId: string
  /** Helix user ID */
  twitchUserId: string
}

/**
 * Gets the YouTube channels to crawl: those of active, non-deleted talents.
 */
export async function getActiveYouTubeChannels(
  supabaseClient: TypedSupabaseClient,
): Promise<ActiveYouTubeChannel[]> {
  const { data, error } = await supabaseClient
    .from('talents')
    .select('id, youtube_channels!inner(id, youtube_channel_id)')
    .eq('status', 'active')
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load YouTube channels', error)
  }

  return data.flatMap((talent) =>
    talent.youtube_channels.map((channel) => ({
      id: channel.id,
      talentId: talent.id,
      youtubeChannelId: channel.youtube_channel_id,
    })),
  )
}

/**
 * Gets the Twitch accounts to crawl: those of active, non-deleted talents.
 */
export async function getActiveTwitchUsers(
  supabaseClient: TypedSupabaseClient,
): Promise<ActiveTwitchUser[]> {
  const { data, error } = await supabaseClient
    .from('talents')
    .select('id, twitch_users!inner(id, twitch_user_id)')
    .eq('status', 'active')
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load Twitch users', error)
  }

  return data.flatMap((talent) =>
    talent.twitch_users.map((user) => ({
      id: user.id,
      talentId: talent.id,
      twitchUserId: user.twitch_user_id,
    })),
  )
}

/**
 * Gets one YouTube channel by the primary key of its row, provided its talent
 * is not deleted. Retired talents are included: their past videos are still
 * listed on the site.
 */
export async function findYouTubeChannel(
  supabaseClient: TypedSupabaseClient,
  id: string,
): Promise<ActiveYouTubeChannel | null> {
  const { data, error } = await supabaseClient
    .from('youtube_channels')
    .select('id, talent_id, youtube_channel_id, talents!inner(id)')
    .eq('id', id)
    .is('talents.deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new DatabaseError('Failed to load a YouTube channel', error)
  }

  return data
    ? {
        id: data.id,
        talentId: data.talent_id,
        youtubeChannelId: data.youtube_channel_id,
      }
    : null
}

/**
 * Gets one Twitch account by the primary key of its row, provided its talent
 * is not deleted. Retired talents are included: their past videos are still
 * listed on the site.
 */
export async function findTwitchUser(
  supabaseClient: TypedSupabaseClient,
  id: string,
): Promise<ActiveTwitchUser | null> {
  const { data, error } = await supabaseClient
    .from('twitch_users')
    .select('id, talent_id, twitch_user_id, talents!inner(id)')
    .eq('id', id)
    .is('talents.deleted_at', null)
    .maybeSingle()

  if (error) {
    throw new DatabaseError('Failed to load a Twitch user', error)
  }

  return data
    ? {
        id: data.id,
        talentId: data.talent_id,
        twitchUserId: data.twitch_user_id,
      }
    : null
}
