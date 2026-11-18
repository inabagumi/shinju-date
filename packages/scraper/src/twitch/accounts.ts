import type { Tables } from "@shinju-date/database";

import { DatabaseError } from "../internal/database-error.js";
import { TWITCH_USERS } from "../internal/database/talents.js";
import type { AccountAdapter } from "../internal/operations/sync-accounts.js";
import type { TwitchFetcher } from "./fetcher.js";
import { syncTwitchUserIcon } from "./profile-image.js";
import type { SavedTwitchUserIcon } from "./profile-image.js";
import type { TwitchUser } from "./types.js";

/** The columns of a user that are kept in line with Twitch. */
export type TwitchUserFields = Pick<
  Tables<"twitch_users">,
  "name" | "twitch_login_name"
>;

export interface SavedTwitchUser
  extends SavedTwitchUserIcon, TwitchUserFields {}

export type TwitchAccountAdapter = AccountAdapter<
  TwitchUser,
  SavedTwitchUser,
  TwitchUserFields
>;

/**
 * Describes Twitch users to the shared account sync, reading Twitch through
 * `fetcher`.
 */
export const createTwitchAccounts = (
  fetcher: TwitchFetcher
): TwitchAccountAdapter => ({
  accountTable: TWITCH_USERS,
  getAccounts: (platformIds) => fetcher.getAccounts(platformIds),
  getPlatformId: (saved) => saved.twitch_user_id,
  label: "Twitchユーザー",
  platformIdKey: "twitchUserId",
  savedAccountColumns:
    "id, name, twitch_login_name, twitch_user_id, profile_images(id, path, etag, source_url)",
  syncIcon: ({ now, supabaseClient }, saved, user) =>
    syncTwitchUserIcon({ now, saved, supabaseClient, user }),
  toDetails: (user) => ({
    name: user.display_name,
    twitch_login_name: user.login,
  }),
  async updateDetails({ logger, supabaseClient }, saved, details) {
    const { error } = await supabaseClient
      .from("twitch_users")
      .update(details)
      .eq("id", saved.id);

    if (error) {
      throw new DatabaseError("Failed to update a Twitch user", error);
    }

    logger.info("Twitchユーザーの情報を更新しました", {
      login: `${saved.twitch_login_name} -> ${details.twitch_login_name}`,
      name: `${saved.name} -> ${details.name}`,
      twitchUserId: saved.twitch_user_id,
    });
  },
});
