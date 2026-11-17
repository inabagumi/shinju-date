import type { Tables } from '@shinju-date/database'
import { diffAccountFields } from '../internal/account-fields.js'
import { countChanges } from '../internal/concurrency.js'
import { WRITE_CONCURRENCY } from '../internal/constants.js'
import { DatabaseError } from '../internal/errors.js'
import { removeUnusedProfileImages } from '../internal/profile-images/index.js'
import type {
  AccountChanges,
  CrawlContext,
  SyncAccountResult,
  TypedSupabaseClient,
} from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import {
  type SavedYouTubeChannelIcon,
  syncYouTubeChannelIcon,
} from './profile-image.js'
import type { YouTubeChannel } from './types.js'

/** The columns of a channel that are kept in line with YouTube. */
export type YouTubeChannelFields = Pick<
  Tables<'youtube_channels'>,
  'name' | 'youtube_handle'
>

interface SavedYouTubeChannel
  extends SavedYouTubeChannelIcon,
    YouTubeChannelFields {}

/** What syncing one channel wrote. */
interface ChannelSyncOutcome {
  changes: AccountChanges<YouTubeChannelFields> | undefined
  iconUpdated: boolean
}

/**
 * Loads the saved channels of non-deleted talents (retired ones included),
 * or of one talent only.
 *
 * @throws When the channels cannot be loaded.
 */
async function loadSavedChannels(
  supabaseClient: TypedSupabaseClient,
  talentId?: string,
): Promise<SavedYouTubeChannel[]> {
  let query = supabaseClient
    .from('talents')
    .select(
      'id, youtube_channels!inner(id, name, youtube_channel_id, youtube_handle, profile_images(id, path, etag, source_url))',
    )
    .is('deleted_at', null)

  if (talentId !== undefined) {
    query = query.eq('id', talentId)
  }

  const { data: talents, error } = await query

  if (error) {
    throw new DatabaseError('Failed to load YouTube channels', error)
  }

  return talents.flatMap((talent) => talent.youtube_channels)
}

/**
 * Updates the name and handle of a saved channel.
 *
 * @returns The columns that changed, or `undefined` when nothing was written.
 * @throws When the channel cannot be updated.
 */
async function syncDetails(
  { logger, supabaseClient }: CrawlContext<YouTubeFetcher>,
  channel: YouTubeChannel,
  saved: SavedYouTubeChannel,
): Promise<AccountChanges<YouTubeChannelFields> | undefined> {
  const name = channel.snippet.title
  const handle = channel.snippet.customUrl || null
  const changes = diffAccountFields<YouTubeChannelFields>(
    { name: saved.name, youtube_handle: saved.youtube_handle },
    { name, youtube_handle: handle },
  )

  if (!changes) {
    return undefined
  }

  const { error } = await supabaseClient
    .from('youtube_channels')
    .update({ name, youtube_handle: handle })
    .eq('id', saved.id)

  if (error) {
    throw new DatabaseError('Failed to update a YouTube channel', error)
  }

  logger.info('YouTubeチャンネルの情報を更新しました', {
    handle: `${saved.youtube_handle} -> ${handle}`,
    name: `${saved.name} -> ${name}`,
    youtubeChannelId: channel.id,
  })

  return changes
}

/**
 * Updates the stored icon of a saved channel.
 *
 * A failure is reported instead of thrown, so that an icon that cannot be
 * stored never keeps the name and handle from being synced.
 *
 * @returns Whether anything was written.
 */
async function syncIcon(
  { logger, now, reportError, supabaseClient }: CrawlContext<YouTubeFetcher>,
  channel: YouTubeChannel,
  saved: SavedYouTubeChannel,
): Promise<boolean> {
  try {
    const result = await syncYouTubeChannelIcon({
      channel,
      now,
      saved,
      supabaseClient,
    })

    if (result === 'unchanged') {
      return false
    }

    logger.info('YouTubeチャンネルのアイコンを更新しました', {
      result,
      youtubeChannelId: channel.id,
    })

    return true
  } catch (error) {
    reportError(error, {
      operation: 'syncProfileImage',
      youtubeChannelId: channel.id,
    })

    return false
  }
}

/**
 * Syncs the name and handle of a saved channel, then its icon.
 *
 * @throws When the name and handle cannot be written; the icon is not synced
 *   then.
 */
async function syncChannel(
  context: CrawlContext<YouTubeFetcher>,
  channel: YouTubeChannel,
  saved: SavedYouTubeChannel,
): Promise<ChannelSyncOutcome> {
  const changes = await syncDetails(context, channel, saved)
  const iconUpdated = await syncIcon(context, channel, saved)

  return { changes, iconUpdated }
}

/**
 * Deletes icons no channel or user uses any more, e.g. those of deleted
 * channels. Unused icons are never served, so a failure is only reported.
 */
async function cleanUpProfileImages({
  logger,
  now,
  reportError,
  supabaseClient,
}: CrawlContext<YouTubeFetcher>): Promise<void> {
  try {
    const removedCount = await removeUnusedProfileImages(supabaseClient, {
      now,
    })

    if (removedCount > 0) {
      logger.info('使われていないアイコンを削除しました', { removedCount })
    }
  } catch (error) {
    reportError(error, { operation: 'removeUnusedProfileImages' })
  }
}

/**
 * Brings the name, handle and icon of saved YouTube channels in line with
 * YouTube, then deletes icons that are no longer used.
 *
 * Channels of retired talents are included (deleted talents are not), and
 * `talents.name` is deliberately left alone: it is managed independently of
 * the channel name.
 *
 * @returns The number of channels updated.
 */
export async function syncYouTubeChannels(
  context: CrawlContext<YouTubeFetcher>,
): Promise<number> {
  const { fetcher, reportError, supabaseClient } = context
  const savedChannels = await loadSavedChannels(supabaseClient)
  const savedByYouTubeId = new Map(
    savedChannels.map((saved) => [saved.youtube_channel_id, saved]),
  )
  const channels = await fetcher.getAccounts([...savedByYouTubeId.keys()])

  const changedCount = await countChanges(
    channels,
    WRITE_CONCURRENCY,
    async (channel) => {
      const saved = savedByYouTubeId.get(channel.id)

      if (!saved) {
        return false
      }

      const { changes, iconUpdated } = await syncChannel(
        context,
        channel,
        saved,
      )

      return changes !== undefined || iconUpdated
    },
    (error, channel) => reportError(error, { youtubeChannelId: channel.id }),
  )

  await cleanUpProfileImages(context)

  return changedCount
}

/**
 * Brings the name, handle and icon of the YouTube channels of one talent in
 * line with YouTube, with the same functions as {@link syncYouTubeChannels}:
 * a channel is written only when something changed.
 *
 * Unused icons are not deleted here; the scheduled sync picks them up.
 *
 * @returns One result per saved channel of the talent; empty when the talent
 *   has none or was deleted.
 * @throws When the channels cannot be loaded or YouTube cannot be read.
 */
export async function syncYouTubeChannelsOfTalent(
  context: CrawlContext<YouTubeFetcher>,
  talentId: string,
): Promise<SyncAccountResult<YouTubeChannelFields>[]> {
  const { fetcher, reportError, supabaseClient } = context
  const savedChannels = await loadSavedChannels(supabaseClient, talentId)

  if (savedChannels.length === 0) {
    return []
  }

  const channels = await fetcher.getAccounts(
    savedChannels.map((saved) => saved.youtube_channel_id),
  )
  const channelById = new Map(channels.map((channel) => [channel.id, channel]))

  return Promise.all(
    savedChannels.map(
      async (saved): Promise<SyncAccountResult<YouTubeChannelFields>> => {
        const channel = channelById.get(saved.youtube_channel_id)
        const notSynced = {
          accountId: saved.id,
          iconUpdated: false,
          name: saved.name,
        }

        if (!channel) {
          return { ...notSynced, status: 'not-found' }
        }

        try {
          const { changes, iconUpdated } = await syncChannel(
            context,
            channel,
            saved,
          )

          return {
            accountId: saved.id,
            iconUpdated,
            name: channel.snippet.title,
            status: changes || iconUpdated ? 'updated' : 'unchanged',
            ...(changes ? { changes } : {}),
          }
        } catch (error) {
          reportError(error, { youtubeChannelId: channel.id })

          return { ...notSynced, status: 'failed' }
        }
      },
    ),
  )
}
