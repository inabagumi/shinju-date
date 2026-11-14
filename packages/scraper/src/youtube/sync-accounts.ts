import { countChanges } from '../internal/concurrency.js'
import { DatabaseError } from '../internal/database/index.js'
import { removeUnusedProfileImages } from '../internal/profile-images/index.js'
import type { CrawlContext } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'
import {
  type SavedYouTubeChannelIcon,
  syncYouTubeChannelIcon,
} from './profile-image.js'
import type { YouTubeChannel } from './types.js'

const UPDATE_CONCURRENCY = 8

interface SavedYouTubeChannel extends SavedYouTubeChannelIcon {
  name: string | null
  youtube_handle: string | null
}

/**
 * Updates the name and handle of a saved channel.
 *
 * @returns Whether anything was written.
 * @throws When the channel cannot be updated.
 */
async function syncDetails(
  { logger, supabaseClient }: CrawlContext<YouTubeFetcher>,
  channel: YouTubeChannel,
  saved: SavedYouTubeChannel,
): Promise<boolean> {
  const name = channel.snippet.title
  const handle = channel.snippet.customUrl || null

  if (saved.name === name && saved.youtube_handle === handle) {
    return false
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

  return true
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
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, youtube_channels!inner(id, name, youtube_channel_id, youtube_handle, profile_images(id, path, etag, source_url))',
    )
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load YouTube channels', error)
  }

  const savedChannels: SavedYouTubeChannel[] = talents.flatMap(
    (talent) => talent.youtube_channels,
  )
  const savedByYouTubeId = new Map(
    savedChannels.map((saved) => [saved.youtube_channel_id, saved]),
  )
  const channels = await fetcher.getAccounts([...savedByYouTubeId.keys()])

  const changedCount = await countChanges(
    channels,
    UPDATE_CONCURRENCY,
    async (channel) => {
      const saved = savedByYouTubeId.get(channel.id)

      if (!saved) {
        return false
      }

      const detailsChanged = await syncDetails(context, channel, saved)
      const iconChanged = await syncIcon(context, channel, saved)

      return detailsChanged || iconChanged
    },
    (error, channel) => reportError(error, { youtubeChannelId: channel.id }),
  )

  await cleanUpProfileImages(context)

  return changedCount
}
