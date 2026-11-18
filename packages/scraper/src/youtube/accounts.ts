import type { Tables } from "@shinju-date/database";

import { YOUTUBE_CHANNELS } from "../internal/database/index.js";
import { DatabaseError } from "../internal/errors.js";
import type { AccountAdapter } from "../internal/operations/sync-accounts.js";
import type { YouTubeFetcher } from "./fetcher.js";
import { syncYouTubeChannelIcon } from "./profile-image.js";
import type { SavedYouTubeChannelIcon } from "./profile-image.js";
import type { YouTubeChannel } from "./types.js";

/** The columns of a channel that are kept in line with YouTube. */
export type YouTubeChannelFields = Pick<
  Tables<"youtube_channels">,
  "name" | "youtube_handle"
>;

export interface SavedYouTubeChannel
  extends SavedYouTubeChannelIcon, YouTubeChannelFields {}

export type YouTubeAccountAdapter = AccountAdapter<
  YouTubeChannel,
  SavedYouTubeChannel,
  YouTubeChannelFields
>;

/**
 * Describes YouTube channels to the shared account sync, reading YouTube
 * through `fetcher`.
 */
export const createYouTubeAccounts = (
  fetcher: YouTubeFetcher
): YouTubeAccountAdapter => ({
  accountTable: YOUTUBE_CHANNELS,
  getAccounts: (platformIds) => fetcher.getAccounts(platformIds),
  getPlatformId: (saved) => saved.youtube_channel_id,
  label: "YouTubeチャンネル",
  platformIdKey: "youtubeChannelId",
  savedAccountColumns:
    "id, name, youtube_channel_id, youtube_handle, profile_images(id, path, etag, source_url)",
  syncIcon: ({ now, supabaseClient }, saved, channel) =>
    syncYouTubeChannelIcon({ channel, now, saved, supabaseClient }),
  toDetails: (channel) => ({
    name: channel.snippet.title,
    youtube_handle: channel.snippet.customUrl || null,
  }),
  async updateDetails({ logger, supabaseClient }, saved, details) {
    const { error } = await supabaseClient
      .from("youtube_channels")
      .update(details)
      .eq("id", saved.id);

    if (error) {
      throw new DatabaseError("Failed to update a YouTube channel", error);
    }

    logger.info("YouTubeチャンネルの情報を更新しました", {
      handle: `${saved.youtube_handle} -> ${details.youtube_handle}`,
      name: `${saved.name} -> ${details.name}`,
      youtubeChannelId: saved.youtube_channel_id,
    });
  },
});
