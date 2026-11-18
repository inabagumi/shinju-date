import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTalent,
  createThumbnail,
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
  fetchOldestVideoDate,
  fetchScheduleToday,
  fetchScheduleVideos,
} from "./schedule";

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

setupSupabase();

/** The IDs of the given rows or results, to compare them in order */
const ids = (rows: readonly { id: string }[]): string[] =>
  rows.map((row) => row.id);

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

const video = (publishedAt: string, overrides = {}) =>
  createVideoOnYouTube(channel, {
    published_at: publishedAt,
    ...overrides,
  });

describe("lib/data/schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(fetchScheduleVideos, () => {
    it("returns the standard videos of every status from Sunday to Saturday in Japan, by start", async () => {
      // 00:00 on Sunday, 8 November in Japan
      const first = video("2026-11-07T15:00:00Z", { status: "ENDED" });
      const published = video("2026-11-09T12:00:00Z", { status: "PUBLISHED" });
      const live = video("2026-11-12T12:00:00Z", { status: "LIVE" });
      const last = video("2026-11-14T14:59:59Z", { status: "UPCOMING" });

      await seedVideos([
        last,
        live,
        first,
        published,
        video("2026-11-07T14:59:59Z"),
        // 00:00 on Sunday, 15 November in Japan
        video("2026-11-14T15:00:00Z"),
        video("2026-11-10T12:00:00Z", { video_kind: "short" }),
      ]);

      expect(ids(await fetchScheduleVideos("2026-11-08"))).toStrictEqual([
        first.video.id,
        published.video.id,
        live.video.id,
        last.video.id,
      ]);
      expect(cacheLife).toHaveBeenCalledWith("hours");
      expect(cacheTag).toHaveBeenCalledWith("videos");
    });

    it("returns the theme color of the talent without the thumbnail", async () => {
      const thumbnail = createThumbnail();
      const row = video("2026-11-10T12:00:00Z", { thumbnail_id: thumbnail.id });

      await seedSupabase({
        talents: [{ ...talent, theme_color: "#FF6B9D" }],
        thumbnails: [thumbnail],
        youtubeChannels: [channel],
        ...videoSeed([row]),
      });

      const [scheduleVideo] = await fetchScheduleVideos("2026-11-08");

      expect(scheduleVideo).not.toHaveProperty("thumbnail");
      expect(scheduleVideo?.talent).toStrictEqual({
        id: talent.id,
        name: "朝霧ミオ",
        theme_color: "#FF6B9D",
      });
    });

    it("drops the videos without a YouTube or Twitch video", async () => {
      const shown = video("2026-11-10T12:00:00Z");

      await seedVideos([
        shown,
        createVideo({
          published_at: "2026-11-10T12:00:00Z",
          talent_id: talent.id,
        }),
      ]);

      expect(ids(await fetchScheduleVideos("2026-11-08"))).toStrictEqual([
        shown.video.id,
      ]);
    });

    it("drops the videos that cannot be linked to", async () => {
      const shown = video("2026-11-10T12:00:00Z");
      // A Twitch stream whose archive is not ready, by a user without the login
      // name to link to the channel
      const userWithoutLogin = createTwitchUser({ talent_id: talent.id });

      await seedSupabase({
        talents: [talent],
        twitchUsers: [userWithoutLogin],
        youtubeChannels: [channel],
        ...videoSeed([
          shown,
          createVideoOnTwitch(
            userWithoutLogin,
            { published_at: "2026-11-10T13:00:00Z", status: "ENDED" },
            { twitch_video_id: "live:12345678901", type: null }
          ),
        ]),
      });

      expect(ids(await fetchScheduleVideos("2026-11-08"))).toStrictEqual([
        shown.video.id,
      ]);
    });

    it("throws when the videos cannot be fetched", async () => {
      failSupabase("videos", "failed");

      await expect(fetchScheduleVideos("2026-11-08")).rejects.toThrow("failed");
    });
  });

  describe(fetchOldestVideoDate, () => {
    it("returns the date in Japan the oldest video starts on", async () => {
      await seedVideos([
        createVideoOnYouTube(channel, { published_at: "2020-01-01T00:00:00Z" }),
        // 00:30 on 1 April 2019 in Japan
        createVideoOnYouTube(channel, { published_at: "2019-03-31T15:30:00Z" }),
        createVideoOnYouTube(channel, { published_at: "2019-06-01T00:00:00Z" }),
      ]);

      await expect(fetchOldestVideoDate()).resolves.toBe("2019-04-01");
      expect(cacheLife).toHaveBeenCalledWith("days");
      expect(cacheTag).toHaveBeenCalledWith("videos");
    });

    it("returns null without any video", async () => {
      await expect(fetchOldestVideoDate()).resolves.toBeNull();
    });
  });

  describe(fetchScheduleToday, () => {
    it("returns today in Japan", async () => {
      // 00:30 on Monday, 16 November 2026 in Japan, still Sunday in UTC
      mockNow("2026-11-15T15:30:00Z");

      await expect(fetchScheduleToday()).resolves.toBe("2026-11-16");
      expect(cacheLife).toHaveBeenCalledWith("minutes");
    });
  });
});
