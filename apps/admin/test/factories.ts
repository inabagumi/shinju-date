import type { Tables } from "@shinju-date/database";
import type { BackfillJob } from "@shinju-date/video-backfill";

/**
 * Rows of the tables that the Server Actions read, with sensible defaults
 * for tests. Pass only what the test is about; a query that selects fewer
 * columns ignores the rest.
 */

const TIMESTAMP = "2024-01-01T00:00:00Z";

/** Builds a `talents` row. */
export function createTalent(
  overrides: Partial<Tables<"talents">> = {}
): Tables<"talents"> {
  return {
    created_at: TIMESTAMP,
    deleted_at: null,
    id: "talent-1",
    name: "Test Talent",
    reading: null,
    status: "active",
    theme_color: null,
    updated_at: TIMESTAMP,
    ...overrides,
  };
}

/** Builds a `videos` row. */
export function createVideo(
  overrides: Partial<Tables<"videos">> = {}
): Tables<"videos"> {
  return {
    created_at: TIMESTAMP,
    deleted_at: null,
    deleted_reason: null,
    duration: "PT1H",
    id: "video-1",
    platform: "youtube",
    published_at: TIMESTAMP,
    status: "ENDED",
    talent_id: "talent-1",
    thumbnail_id: null,
    title: "Test Video",
    updated_at: TIMESTAMP,
    video_kind: "standard",
    visible: true,
    ...overrides,
  };
}

/** Builds a `youtube_channels` row. */
export function createYouTubeChannel(
  overrides: Partial<Tables<"youtube_channels">> = {}
): Tables<"youtube_channels"> {
  return {
    id: "channel-1",
    name: "Test Channel",
    profile_image_id: null,
    talent_id: "talent-1",
    youtube_channel_id: "UC1234567890123456789012",
    youtube_handle: null,
    ...overrides,
  };
}

/** Builds a `twitch_users` row. */
export function createTwitchUser(
  overrides: Partial<Tables<"twitch_users">> = {}
): Tables<"twitch_users"> {
  return {
    id: "twitch-user-1",
    name: "Test User",
    profile_image_id: null,
    talent_id: "talent-1",
    twitch_login_name: "testuser",
    twitch_user_id: "12345678",
    ...overrides,
  };
}

/** Builds a job of the queue of `@shinju-date/video-backfill`. */
export function createBackfillJob(
  overrides: Partial<BackfillJob> = {}
): BackfillJob {
  return {
    accountId: "channel-row-1",
    added: 0,
    attempts: 0,
    cursor: null,
    error: null,
    finishedAt: null,
    id: "youtube:channel-row-1",
    pages: 0,
    provider: "youtube",
    requestedAt: TIMESTAMP,
    requestedBy: null,
    startedAt: null,
    status: "pending",
    talentId: "talent-1",
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}
