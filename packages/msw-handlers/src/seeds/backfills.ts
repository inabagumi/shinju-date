import type { Tables } from "@shinju-date/database";
import { toDBString } from "@shinju-date/temporal-fns";

import type { SeedContext } from "./context.js";

interface BackfillsDependencies {
  twitchUsers: readonly Tables<"twitch_users">[];
  youtubeChannels: readonly Tables<"youtube_channels">[];
}

/**
 * The history of backfill jobs: a YouTube channel (the first) that was
 * backfilled, and a Twitch user (the second) whose latest backfill failed
 * after an earlier one succeeded, so that the failure alert and the bulk
 * retry can be checked.
 */
export function createBackfills(
  { faker, now }: SeedContext,
  { twitchUsers, youtubeChannels }: BackfillsDependencies
): Tables<"video_backfill_jobs">[] {
  const [channel] = youtubeChannels;
  const failedTwitchUser = twitchUsers[1];

  if (!channel || !failedTwitchUser) {
    return [];
  }

  const jobs = [
    {
      account_id: channel.id,
      added: 128,
      error: null,
      hoursAgo: 30,
      pages: 3,
      platform: "youtube" as const,
      status: "done" as const,
      talent_id: channel.talent_id,
    },
    {
      account_id: failedTwitchUser.id,
      added: 40,
      error: null,
      hoursAgo: 48,
      pages: 1,
      platform: "twitch" as const,
      status: "done" as const,
      talent_id: failedTwitchUser.talent_id,
    },
    {
      account_id: failedTwitchUser.id,
      added: 2,
      error: "Twitch API request failed with status 503",
      hoursAgo: 6,
      pages: 1,
      platform: "twitch" as const,
      status: "failed" as const,
      talent_id: failedTwitchUser.talent_id,
    },
  ];

  return jobs.map(({ hoursAgo, ...job }) => {
    const finishedAt = now.subtract({ hours: hoursAgo });
    const requestedAt = toDBString(finishedAt.subtract({ minutes: 10 }));

    return {
      ...job,
      created_at: toDBString(finishedAt),
      finished_at: toDBString(finishedAt),
      id: faker.string.uuid(),
      requested_at: requestedAt,
      requested_by: null,
      run_id: null,
      started_at: requestedAt,
    };
  });
}
