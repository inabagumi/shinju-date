import { countChanges } from '../internal/concurrency.js'
import { DatabaseError } from '../internal/database/index.js'
import type { CrawlContext } from '../types.js'
import type { YouTubeFetcher } from './fetcher.js'

const UPDATE_CONCURRENCY = 8

/**
 * Brings the name and handle of saved YouTube channels in line with YouTube.
 *
 * Channels of retired talents are included (deleted talents are not), and
 * `talents.name` is deliberately left alone: it is managed independently of
 * the channel name.
 *
 * @returns The number of channels updated.
 */
export async function syncYouTubeChannels({
  fetcher,
  logger,
  reportError,
  supabaseClient,
}: CrawlContext<YouTubeFetcher>): Promise<number> {
  const { data: talents, error } = await supabaseClient
    .from('talents')
    .select(
      'id, youtube_channels!inner(id, name, youtube_channel_id, youtube_handle)',
    )
    .is('deleted_at', null)

  if (error) {
    throw new DatabaseError('Failed to load YouTube channels', error)
  }

  const savedChannels = talents.flatMap((talent) => talent.youtube_channels)
  const savedByYouTubeId = new Map(
    savedChannels.map((saved) => [saved.youtube_channel_id, saved]),
  )
  const channels = await fetcher.getAccounts([...savedByYouTubeId.keys()])

  return countChanges(
    channels,
    UPDATE_CONCURRENCY,
    async (channel) => {
      const saved = savedByYouTubeId.get(channel.id)
      const name = channel.snippet.title
      const handle = channel.snippet.customUrl || null

      if (!saved || (saved.name === name && saved.youtube_handle === handle)) {
        return false
      }

      const { error: updateError } = await supabaseClient
        .from('youtube_channels')
        .update({ name, youtube_handle: handle })
        .eq('id', saved.id)

      if (updateError) {
        throw new DatabaseError(
          'Failed to update a YouTube channel',
          updateError,
        )
      }

      logger.info('YouTubeチャンネルの情報を更新しました', {
        handle: `${saved.youtube_handle} -> ${handle}`,
        name: `${saved.name} -> ${name}`,
        youtubeChannelId: channel.id,
      })

      return true
    },
    (error, channel) => reportError(error, { youtubeChannelId: channel.id }),
  )
}
