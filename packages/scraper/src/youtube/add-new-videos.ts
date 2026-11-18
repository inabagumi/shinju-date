import { countChanges } from "../internal/concurrency.js";
import { WRITE_CONCURRENCY } from "../internal/constants.js";
import {
  findSavedYouTubeVideoIds,
  getActiveAccounts,
  type TalentAccount,
  YOUTUBE_CHANNELS,
} from "../internal/database/index.js";
import { saveVideoWithThumbnail } from "../internal/operations/save-video.js";
import type { CrawlContext } from "../types.js";
import type { YouTubeFetcher } from "./fetcher.js";
import { YOUTUBE_NEW_VIDEOS } from "./platform.js";

/**
 * Adds videos that appeared on the channels of active talents.
 *
 * Only the newest uploads of each channel are inspected, and video details are
 * requested just for the IDs that are not saved yet, so a run that finds
 * nothing new costs one cheap request per channel. Existing videos are never
 * touched here.
 *
 * @returns The number of videos added.
 */
export async function addNewYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context;
  const channels = await getActiveAccounts(supabaseClient, YOUTUBE_CHANNELS);

  if (channels.length === 0) {
    return 0;
  }

  const { failures, missingAccountIds, videos } = await fetcher.getRecentVideos(
    channels.map((channel) => channel.platformId)
  );

  for (const { accountId, error } of failures) {
    reportError(error, { youtubeChannelId: accountId });
  }

  if (missingAccountIds.length > 0) {
    logger.warn("YouTubeでチャンネルが見つかりませんでした", {
      channelIds: missingAccountIds.join(","),
    });
  }

  const channelById = new Map(
    channels.map((channel) => [channel.platformId, channel])
  );
  const channelByVideoId = new Map<string, TalentAccount>();

  for (const { channelId, videoId } of videos) {
    const channel = channelById.get(channelId);

    if (channel) {
      channelByVideoId.set(videoId, channel);
    }
  }

  return saveNewYouTubeVideos(context, channelByVideoId);
}

/**
 * Saves the listed videos that are not saved yet. Details are requested only
 * for those, so a page of videos that are all saved costs no further request.
 * Shared by the discovery of new videos and by backfills of past ones, so
 * both store videos the same way.
 *
 * @param channelByVideoId - The channel each listed video ID belongs to.
 * @param concurrency - Videos saved at once.
 * @returns The number of videos added.
 */
export async function saveNewYouTubeVideos(
  context: CrawlContext<YouTubeFetcher>,
  channelByVideoId: ReadonlyMap<string, TalentAccount>,
  concurrency = WRITE_CONCURRENCY
): Promise<number> {
  const { fetcher, logger, reportError, supabaseClient } = context;
  const listedIds = [...channelByVideoId.keys()];

  if (listedIds.length === 0) {
    return 0;
  }

  const savedIds = await findSavedYouTubeVideoIds(supabaseClient, listedIds);
  const newIds = listedIds.filter((id) => !savedIds.has(id));

  if (newIds.length === 0) {
    return 0;
  }

  const { videos } = await fetcher.getVideos(newIds);

  return countChanges(
    videos,
    concurrency,
    async (video) => {
      const channel = channelByVideoId.get(video.id);

      if (
        !channel ||
        !(await saveVideoWithThumbnail(
          context,
          YOUTUBE_NEW_VIDEOS,
          video,
          channel
        ))
      ) {
        return false;
      }

      logger.info("動画を追加しました", {
        duration: video.contentDetails.duration ?? "P0D",
        platform: "youtube",
        title: video.snippet.title ?? "",
        youtubeVideoId: video.id,
      });

      return true;
    },
    (error, video) => reportError(error, { youtubeVideoId: video.id })
  );
}
