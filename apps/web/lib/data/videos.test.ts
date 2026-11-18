import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SEARCH_RESULT_COUNT } from "@/lib/site";
import {
  createProfileImage,
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
  countVideos,
  fetchCalendarVideos,
  fetchCurrentTime,
  fetchDashboardVideos,
  fetchUpcomingVideos,
  fetchVideos,
} from "./videos";

// Vitest does not run `'use cache'`, so only what the fetchers pass to the
// cache is checked
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));

setupSupabase();

/** The IDs of the given rows or results, to compare them in order */
function ids(rows: readonly { id: string }[]): string[] {
  return rows.map((row) => row.id);
}

const talent = createTalent({ name: "朝霧ミオ" });
const otherTalent = createTalent({ name: "風花リツ" });
const channel = createYouTubeChannel({ talent_id: talent.id });
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id });
const twitchUser = createTwitchUser({
  talent_id: otherTalent.id,
  twitch_login_name: "ritsu",
});

/** Put the talents, their accounts and the given videos in the database */
function seedVideos(
  rows: Parameters<typeof videoSeed>[0]
): ReturnType<typeof seedSupabase> {
  return seedSupabase({
    talents: [talent, otherTalent],
    twitchUsers: [twitchUser],
    youtubeChannels: [channel, otherChannel],
    ...videoSeed(rows),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchVideos", () => {
  beforeEach(() => {
    mockNow("2026-11-15T03:20:00Z");
  });

  it("searches the videos of all talents by default", async () => {
    const song = createVideoOnYouTube(channel, { title: "歌枠" });
    const otherSong = createVideoOnYouTube(otherChannel, {
      published_at: "2026-11-14T12:00:00Z",
      title: "歌ってみた",
    });
    const chat = createVideoOnYouTube(channel, { title: "雑談" });

    await seedVideos([song, otherSong, chat]);

    expect(ids(await fetchVideos({ query: "歌" }))).toEqual([
      song.video.id,
      otherSong.video.id,
    ]);
  });

  it("searches only the videos of the given talents and kind", async () => {
    const short = createVideoOnYouTube(channel, { video_kind: "short" });
    const standard = createVideoOnYouTube(channel);
    const otherShort = createVideoOnYouTube(otherChannel, {
      video_kind: "short",
    });

    await seedVideos([short, standard, otherShort]);

    expect(
      ids(await fetchVideos({ kind: "short", talentIds: [talent.id] }))
    ).toEqual([short.video.id]);
  });

  it("returns the videos before `until`, newest first", async () => {
    const older = createVideoOnYouTube(channel, {
      published_at: "2026-11-10T12:00:00Z",
    });
    const newer = createVideoOnYouTube(channel, {
      published_at: "2026-11-12T12:00:00Z",
    });
    const later = createVideoOnYouTube(channel, {
      published_at: "2026-11-14T12:00:00Z",
    });

    await seedVideos([older, later, newer]);

    const until = Temporal.Instant.from(later.video.published_at);

    expect(ids(await fetchVideos({ until: until.epochNanoseconds }))).toEqual([
      newer.video.id,
      older.video.id,
    ]);
  });

  it("leaves out the videos without a YouTube or Twitch video", async () => {
    const shown = createVideoOnYouTube(channel);
    const hidden = createVideo({ talent_id: talent.id });

    await seedVideos([shown, hidden]);

    expect(ids(await fetchVideos({}))).toEqual([shown.video.id]);
  });

  it("leaves out the videos that cannot be linked to before the page size", async () => {
    const userWithoutLogin = createTwitchUser({ talent_id: talent.id });
    const shown = Array.from({ length: SEARCH_RESULT_COUNT }, (_, index) =>
      createVideoOnYouTube(channel, {
        published_at: `2026-11-1${index}T12:00:00Z`,
      })
    );
    // The newest is a Twitch stream whose archive is not ready, by a user
    // without the login name to link to the channel
    const pending = createVideoOnTwitch(
      userWithoutLogin,
      { published_at: "2026-11-14T13:00:00Z", status: "ENDED" },
      { twitch_video_id: "live:12345678901", type: null }
    );

    await seedSupabase({
      talents: [talent],
      twitchUsers: [userWithoutLogin],
      youtubeChannels: [channel],
      ...videoSeed([pending, ...shown]),
    });

    expect(ids(await fetchVideos({}))).toEqual(
      shown.map((row) => row.video.id).toReversed()
    );
  });

  it("throws when the videos cannot be searched", async () => {
    failSupabase("rpc/search_videos_v4", "failed");

    await expect(fetchVideos({})).rejects.toThrow("failed");
  });
});

describe("countVideos", () => {
  beforeEach(() => {
    mockNow("2026-11-15T03:20:00Z");
  });

  it("counts the videos of all talents by default", async () => {
    await seedVideos([
      createVideoOnYouTube(channel),
      createVideoOnYouTube(channel),
      createVideoOnYouTube(otherChannel),
    ]);

    await expect(countVideos({})).resolves.toBe(3);
  });

  it("counts only the videos of the given talents", async () => {
    await seedVideos([
      createVideoOnYouTube(channel, { title: "歌枠" }),
      createVideoOnYouTube(channel, { title: "雑談" }),
      createVideoOnYouTube(otherChannel, { title: "歌枠" }),
    ]);

    await expect(
      countVideos({ query: "歌", talentIds: [talent.id] })
    ).resolves.toBe(1);
  });

  it("does not count the videos that cannot be linked to", async () => {
    const userWithoutLogin = createTwitchUser({ talent_id: talent.id });

    await seedSupabase({
      talents: [talent],
      twitchUsers: [userWithoutLogin],
      youtubeChannels: [channel],
      ...videoSeed([
        createVideoOnYouTube(channel),
        createVideoOnTwitch(
          userWithoutLogin,
          { status: "ENDED" },
          { twitch_video_id: "live:12345678901", type: null }
        ),
      ]),
    });

    await expect(countVideos({})).resolves.toBe(1);
  });

  it("throws when the videos cannot be counted", async () => {
    failSupabase("rpc/count_videos_v2", "failed");

    await expect(countVideos({})).rejects.toThrow("failed");
  });
});

describe("fetchCalendarVideos", () => {
  beforeEach(() => {
    mockNow("2026-11-15T03:20:45.5Z");
  });

  it("returns the videos until the start of the hour a week later, latest first", async () => {
    const past = createVideoOnYouTube(channel, {
      published_at: "2026-11-10T12:00:00Z",
    });
    const upcoming = createVideoOnYouTube(channel, {
      published_at: "2026-11-22T02:59:59Z",
      status: "UPCOMING",
    });
    const tooLate = createVideoOnYouTube(channel, {
      published_at: "2026-11-22T03:00:00Z",
      status: "UPCOMING",
    });

    await seedVideos([past, tooLate, upcoming]);

    const videos = await fetchCalendarVideos();

    expect(ids(videos)).toEqual([upcoming.video.id, past.video.id]);
    expect(videos[1]).toEqual({
      duration: "PT1H",
      id: past.video.id,
      platform: "youtube",
      published_at: "2026-11-10T12:00:00Z",
      status: "ENDED",
      talent: { id: talent.id, name: "朝霧ミオ" },
      title: "歌枠",
      twitch_video: null,
      video_kind: "standard",
      youtube_video: { youtube_video_id: past.youtubeVideo.youtube_video_id },
    });
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith("videos");
  });

  it("keeps the latest 100 videos", async () => {
    const rows = Array.from({ length: 101 }, (_, index) =>
      createVideoOnYouTube(channel, {
        published_at: Temporal.Instant.from("2026-11-01T00:00:00Z")
          .add({ minutes: index })
          .toString(),
      })
    );

    await seedVideos(rows);

    const videos = await fetchCalendarVideos();

    expect(videos).toHaveLength(100);
    expect(ids(videos)).not.toContain(rows[0]?.video.id);
  });

  it("narrows the videos by the talents and the kind", async () => {
    const short = createVideoOnYouTube(channel, { video_kind: "short" });
    const standard = createVideoOnYouTube(channel);
    const otherShort = createVideoOnYouTube(otherChannel, {
      video_kind: "short",
    });

    await seedVideos([short, standard, otherShort]);

    expect(
      ids(await fetchCalendarVideos({ kind: "short", talentIds: [talent.id] }))
    ).toEqual([short.video.id]);
    expect(
      ids(
        await fetchCalendarVideos({
          talentIds: [otherTalent.id, talent.id],
        })
      ).toSorted()
    ).toEqual(
      [short.video.id, standard.video.id, otherShort.video.id].toSorted()
    );
  });

  it("leaves out the videos without a platform source", async () => {
    const shown = createVideoOnYouTube(channel);

    await seedVideos([shown, createVideo({ talent_id: talent.id })]);

    expect(ids(await fetchCalendarVideos())).toEqual([shown.video.id]);
  });

  it("throws when the videos cannot be fetched", async () => {
    failSupabase("videos", "failed");

    await expect(fetchCalendarVideos()).rejects.toThrow("failed");
  });
});

describe("fetchDashboardVideos", () => {
  beforeEach(() => {
    mockNow("2026-11-15T12:00:00Z");
  });

  it("returns the live videos, the recent uploads and the recent shorts", async () => {
    const live = createVideoOnYouTube(channel, {
      published_at: "2026-11-15T10:00:00Z",
      status: "LIVE",
    });
    const recent = createVideoOnYouTube(channel, {
      published_at: "2026-11-13T12:00:00Z",
      status: "PUBLISHED",
    });
    const newerRecent = createVideoOnTwitch(twitchUser, {
      published_at: "2026-11-15T11:00:00Z",
      status: "PUBLISHED",
    });
    const short = createVideoOnYouTube(channel, {
      published_at: "2026-11-15T00:00:00Z",
      status: "PUBLISHED",
      video_kind: "short",
    });

    await seedVideos([
      live,
      recent,
      newerRecent,
      short,
      // Too old for the recent uploads and the shorts
      createVideoOnYouTube(channel, {
        published_at: "2026-11-12T11:59:59Z",
        status: "PUBLISHED",
      }),
      createVideoOnYouTube(channel, {
        published_at: "2026-11-14T11:59:59Z",
        status: "PUBLISHED",
        video_kind: "short",
      }),
      // Finished streams stay in the lifecycle of the streams
      createVideoOnYouTube(channel, {
        published_at: "2026-11-15T09:00:00Z",
        status: "ENDED",
      }),
      createVideoOnYouTube(channel, {
        published_at: "2026-11-15T13:00:00Z",
        status: "UPCOMING",
      }),
    ]);

    const videos = await fetchDashboardVideos();

    expect(ids(videos.live)).toEqual([live.video.id]);
    expect(ids(videos.recent)).toEqual([newerRecent.video.id, recent.video.id]);
    expect(ids(videos.shorts)).toEqual([short.video.id]);
  });
});

describe("fetchUpcomingVideos", () => {
  beforeEach(() => {
    // 12:34:56 in Japan, so this hour starts at 03:00 in UTC
    mockNow("2026-11-15T03:34:56Z");
  });

  const upcoming = (publishedAt: string, overrides = {}) =>
    createVideoOnYouTube(channel, {
      duration: "P0D",
      published_at: publishedAt,
      status: "UPCOMING",
      ...overrides,
    });

  it("returns the upcoming videos from this hour to a week later by start, with today in Japan", async () => {
    const first = upcoming("2026-11-15T03:00:00Z");
    const second = upcoming("2026-11-16T11:00:00Z");
    const last = upcoming("2026-11-22T03:00:00Z");

    await seedVideos([
      second,
      last,
      first,
      // The streams that should have started before this hour are left out
      upcoming("2026-11-15T02:59:59Z"),
      upcoming("2026-11-22T03:00:01Z"),
      upcoming("2026-11-16T11:00:00Z", { status: "LIVE" }),
      upcoming("2026-11-16T11:00:00Z", { status: "ENDED" }),
    ]);

    const { today, videos } = await fetchUpcomingVideos();

    expect(today).toBe("2026-11-15");
    expect(ids(videos)).toEqual([
      first.video.id,
      second.video.id,
      last.video.id,
    ]);
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith("videos");
  });

  it("returns the videos with their thumbnails and channels", async () => {
    const thumbnail = createThumbnail();
    const icon = createProfileImage();
    const video = upcoming("2026-11-16T11:00:00Z", {
      thumbnail_id: thumbnail.id,
      title: "歌枠リレー",
    });

    await seedSupabase({
      profileImages: [icon],
      talents: [talent],
      thumbnails: [thumbnail],
      youtubeChannels: [
        {
          ...channel,
          name: "朝霧ミオ Channel",
          profile_image_id: icon.id,
          youtube_handle: "@mio",
        },
      ],
      ...videoSeed([video]),
    });

    const { videos } = await fetchUpcomingVideos();

    expect(videos).toEqual([
      {
        duration: "P0D",
        id: video.video.id,
        platform: "youtube",
        published_at: "2026-11-16T11:00:00Z",
        status: "UPCOMING",
        talent: { id: talent.id, name: "朝霧ミオ" },
        thumbnail: {
          blur_data_url: thumbnail.blur_data_url,
          height: thumbnail.height,
          id: thumbnail.id,
          path: thumbnail.path,
          width: thumbnail.width,
        },
        title: "歌枠リレー",
        twitch_video: null,
        video_kind: "standard",
        youtube_video: {
          youtube_channel: {
            name: "朝霧ミオ Channel",
            profile_image: { blur_data_url: icon.blur_data_url, id: icon.id },
            youtube_handle: "@mio",
          },
          youtube_video_id: video.youtubeVideo.youtube_video_id,
        },
      },
    ]);
  });

  it("keeps the nearest 100 videos", async () => {
    const rows = Array.from({ length: 101 }, (_, index) =>
      upcoming(
        Temporal.Instant.from("2026-11-16T00:00:00Z")
          .add({ minutes: index })
          .toString()
      )
    );

    await seedVideos(rows);

    const { videos } = await fetchUpcomingVideos();

    expect(videos).toHaveLength(100);
    expect(ids(videos)).not.toContain(rows[100]?.video.id);
  });

  it("drops the videos without a YouTube or Twitch video", async () => {
    const shown = upcoming("2026-11-16T11:00:00Z");

    await seedVideos([
      shown,
      createVideo({
        published_at: "2026-11-16T11:00:00Z",
        status: "UPCOMING",
        talent_id: talent.id,
      }),
    ]);

    const { videos } = await fetchUpcomingVideos();

    expect(ids(videos)).toEqual([shown.video.id]);
  });

  it("throws when the videos cannot be fetched", async () => {
    failSupabase("videos", "failed");

    await expect(fetchUpcomingVideos()).rejects.toThrow("failed");
  });
});

describe("fetchCurrentTime", () => {
  it("returns the current time in Japan", async () => {
    mockNow("2026-11-15T15:30:00Z");

    await expect(fetchCurrentTime()).resolves.toBe(
      "2026-11-16T00:30:00+09:00[Asia/Tokyo]"
    );
    expect(cacheLife).toHaveBeenCalledWith("hours");
  });
});
