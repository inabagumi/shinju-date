// @vitest-environment node
import { logger } from "@shinju-date/logger";
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTalent,
  createTwitchUser,
  createVideo,
  createVideoOnTwitch,
  createVideoOnYouTube,
  createYouTubeChannel,
} from "@/test/factories";
import { mockNow } from "@/test/now";
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  videoSeed,
} from "@/test/supabase";

import {
  fetchTalentStreamStarts,
  fetchTalentStreamStatuses,
  fetchTalentStreamStatusesSafe,
} from "./talents";
import { DataFetchError } from "./unwrap";

vi.mock(import("@shinju-date/logger"), () => ({
  logger: {
    debug: vi.fn<typeof logger.debug>(),
    error: vi.fn<typeof logger.error>(),
    info: vi.fn<typeof logger.info>(),
    warn: vi.fn<typeof logger.warn>(),
  },
}));

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

setupSupabase();

const talent = createTalent({ name: "朝霧ミオ" });
const otherTalent = createTalent({ name: "風花リツ" });
const channel = createYouTubeChannel({ talent_id: talent.id });
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id });
const twitchUser = createTwitchUser({
  talent_id: otherTalent.id,
  twitch_login_name: "ritsu",
});

/** Put the talents, their accounts and the given videos in the database */
const seedVideos = (
  rows: Parameters<typeof videoSeed>[0]
): ReturnType<typeof seedSupabase> =>
  seedSupabase({
    talents: [talent, otherTalent],
    twitchUsers: [twitchUser],
    youtubeChannels: [channel, otherChannel],
    ...videoSeed(rows),
  });

const ended = (publishedAt: string, overrides = {}) =>
  createVideoOnYouTube(channel, {
    published_at: publishedAt,
    status: "ENDED",
    ...overrides,
  });

describe("lib/data/talent-streams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(fetchTalentStreamStatuses, () => {
    beforeEach(() => {
      // 03:34:56 in UTC, so this hour starts at 03:00
      mockNow("2026-11-15T03:34:56Z");
    });

    it("returns the earliest upcoming stream of each talent within a week", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, {
          published_at: "2026-11-16T11:00:00Z",
          status: "UPCOMING",
        }),
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T10:00:00Z",
          status: "UPCOMING",
        }),
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T04:00:00Z",
          status: "ENDED",
        }),
        createVideoOnTwitch(twitchUser, {
          published_at: "2026-11-15T12:00:00Z",
          status: "UPCOMING",
        }),
        // A week from the start of the hour, like the upcoming videos of the
        // home page
        createVideoOnTwitch(twitchUser, {
          published_at: "2026-11-22T03:00:01Z",
          status: "UPCOMING",
        }),
      ]);

      await expect(fetchTalentStreamStatuses()).resolves.toStrictEqual({
        [otherTalent.id]: {
          isLive: false,
          nextStreamAt: "2026-11-15T12:00:00Z",
        },
        [talent.id]: { isLive: false, nextStreamAt: "2026-11-15T10:00:00Z" },
      });
    });

    it("returns no talent without a stream within a week", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, {
          published_at: "2026-11-22T03:00:01Z",
          status: "UPCOMING",
        }),
      ]);

      await expect(fetchTalentStreamStatuses()).resolves.toStrictEqual({});
    });

    it("is cached for minutes with the videos tag", async () => {
      await fetchTalentStreamStatuses();

      expect(cacheLife).toHaveBeenCalledWith("minutes");
      expect(cacheTag).toHaveBeenCalledWith("videos");
      expect(cacheTag).not.toHaveBeenCalledWith("talents");
    });

    it("returns no next stream for a talent that is live", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T01:00:00Z",
          status: "LIVE",
        }),
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T10:00:00Z",
          status: "UPCOMING",
        }),
      ]);

      await expect(fetchTalentStreamStatuses()).resolves.toStrictEqual({
        [talent.id]: { isLive: true, nextStreamAt: null },
      });
    });

    it("skips the videos without YouTube or Twitch videos", async () => {
      await seedVideos([
        createVideo({ status: "LIVE", talent_id: talent.id }),
        createVideo({
          published_at: "2026-11-15T10:00:00Z",
          status: "UPCOMING",
          talent_id: otherTalent.id,
        }),
        createVideoOnYouTube(channel, {
          published_at: "2026-11-17T11:00:00Z",
          status: "UPCOMING",
        }),
      ]);

      await expect(fetchTalentStreamStatuses()).resolves.toStrictEqual({
        [talent.id]: { isLive: false, nextStreamAt: "2026-11-17T11:00:00Z" },
      });
    });

    it("skips the upcoming streams that should have started before this hour", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T02:59:59Z",
          status: "UPCOMING",
        }),
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T03:00:00Z",
          status: "UPCOMING",
        }),
        createVideoOnYouTube(otherChannel, {
          published_at: "2026-11-14T10:00:00Z",
          status: "UPCOMING",
        }),
      ]);

      await expect(fetchTalentStreamStatuses()).resolves.toStrictEqual({
        [talent.id]: { isLive: false, nextStreamAt: "2026-11-15T03:00:00Z" },
      });
    });

    it("throws when the videos cannot be fetched", async () => {
      failSupabase("videos", "failed");

      await expect(fetchTalentStreamStatuses()).rejects.toThrow("failed");
    });
  });

  describe(fetchTalentStreamStatusesSafe, () => {
    beforeEach(() => {
      mockNow("2026-11-15T03:34:56Z");
    });

    it("returns the stream statuses", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, {
          published_at: "2026-11-15T01:00:00Z",
          status: "LIVE",
        }),
      ]);

      await expect(fetchTalentStreamStatusesSafe()).resolves.toStrictEqual({
        [talent.id]: { isLive: true, nextStreamAt: null },
      });
      expect(logger.error).not.toHaveBeenCalled();
    });

    it("returns no statuses and logs the error when they cannot be fetched", async () => {
      failSupabase("videos", "failed");

      await expect(fetchTalentStreamStatusesSafe()).resolves.toStrictEqual({});
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch the stream statuses of the talents",
        { error: expect.any(DataFetchError) }
      );
    });
  });

  describe(fetchTalentStreamStarts, () => {
    beforeEach(() => {
      // 00:34:56 on 15 November in Japan, so today starts at 15:00 in UTC
      mockNow("2026-11-14T15:34:56Z");
    });

    it("returns the starts of the finished streams of the talent for 90 days before today", async () => {
      await seedVideos([
        ended("2026-11-13T13:00:00Z"),
        // From 0:00 in Japan 90 days before today
        ended("2026-08-16T15:00:00Z"),
        ended("2026-08-16T14:59:59Z"),
        // To 0:00 of today
        ended("2026-11-14T14:59:59Z"),
        ended("2026-11-14T15:00:00Z"),
        ended("2026-11-14T12:00:00Z", { video_kind: "short" }),
        ended("2026-11-14T12:00:00Z", { status: "PUBLISHED" }),
        createVideoOnYouTube(otherChannel, {
          published_at: "2026-11-14T12:00:00Z",
          status: "ENDED",
        }),
      ]);

      await expect(fetchTalentStreamStarts(talent.id)).resolves.toStrictEqual([
        "2026-11-14T14:59:59Z",
        "2026-11-13T13:00:00Z",
        "2026-08-16T15:00:00Z",
      ]);
    });

    it("is cached for days with the videos tag", async () => {
      await fetchTalentStreamStarts(talent.id);

      expect(cacheLife).toHaveBeenCalledWith("days");
      expect(cacheTag).toHaveBeenCalledWith("videos");
    });

    it("throws when the streams cannot be fetched", async () => {
      failSupabase("videos", "failed");

      await expect(fetchTalentStreamStarts(talent.id)).rejects.toThrow(
        "failed"
      );
    });
  });
});
