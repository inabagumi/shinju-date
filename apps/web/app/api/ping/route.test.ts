// @vitest-environment node
import type { logger } from "@sentry/nextjs";
import { REDIS_KEYS, TIME_ZONE } from "@shinju-date/constants";
import type { Pipeline, Redis } from "@upstash/redis";
import type { track } from "@vercel/analytics/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTalent,
  createTwitchUser,
  createVideoOnTwitch,
  createVideoOnYouTube,
  createYouTubeChannel,
} from "@/test/factories";
import type { VideoOnTwitch, VideoOnYouTube } from "@/test/factories";
import { seedSupabase, setupSupabase, videoSeed } from "@/test/supabase";

const mocks = vi.hoisted(() => ({
  pipeline: {
    // One of the overloads of `exec`, which is generic
    exec: vi.fn<() => Promise<unknown[]>>(),
    expire: vi.fn<Pipeline["expire"]>(),
    zincrby: vi.fn<Pipeline["zincrby"]>(),
  },
  track: vi.fn<typeof track>(),
}));

vi.mock(import("@/lib/redis"), () => ({
  getRedisClient: () =>
    ({
      multi: () => mocks.pipeline as Partial<Pipeline> as Pipeline,
    }) as Partial<Redis> as Redis,
}));

vi.mock(import("@vercel/analytics/server"), () => ({
  track: mocks.track,
}));

vi.mock(import("@sentry/nextjs"), () => ({
  logger: {
    info: vi.fn<typeof logger.info>(),
    warn: vi.fn<typeof logger.warn>(),
  } as Partial<typeof logger> as typeof logger,
}));

import { POST } from "./route";

setupSupabase();

const talentA = createTalent({ name: "Talent A" });
const talentB = createTalent({ name: "Talent B" });
const channel = createYouTubeChannel({ talent_id: talentA.id });
const fooBar = createTwitchUser({
  talent_id: talentA.id,
  twitch_login_name: "foo_bar",
});
const fooxbar = createTwitchUser({
  talent_id: talentB.id,
  twitch_login_name: "fooxbar",
});
const noLogin = createTwitchUser({
  talent_id: talentB.id,
  twitch_login_name: null,
});

const PUBLISHED_AT = "2026-11-16T12:00:00Z";

const youtubeVideo = createVideoOnYouTube(
  channel,
  { published_at: PUBLISHED_AT },
  { youtube_video_id: "ytvid1" }
);
const vod = createVideoOnTwitch(
  fooBar,
  { published_at: PUBLISHED_AT },
  { twitch_video_id: "2000000001" }
);
const clip = createVideoOnTwitch(
  fooBar,
  { published_at: PUBLISHED_AT },
  { twitch_video_id: "FunnyClipSlug", type: "clip" }
);
const otherVideo = createVideoOnTwitch(
  fooxbar,
  { published_at: PUBLISHED_AT },
  { twitch_video_id: "2000000002" }
);

/** Saves the talents, their accounts and the given videos. */
function seed(
  videos: readonly (VideoOnTwitch | VideoOnYouTube)[],
  twitchUsers = [fooBar, fooxbar, noLogin]
): Promise<void> {
  return seedSupabase({
    talents: [talentA, talentB],
    twitchUsers,
    youtubeChannels: [channel],
    ...videoSeed(videos),
  });
}

/** The videos saved before each test. */
const SAVED_VIDEOS = [youtubeVideo, vod, clip, otherVideo];

function ping(url: string): Promise<Response> {
  return POST(
    new Request("https://shinju.date/api/ping", {
      body: "PING",
      headers: {
        "Content-Type": "text/ping",
        "Ping-From": "https://shinju.date/",
        "Ping-To": url,
        "User-Agent": "Mozilla/5.0",
        "X-Forwarded-For": "192.0.2.1",
      },
      method: "POST",
    })
  );
}

/** The ID of the video whose click was counted, if any. */
function countedVideoId(): unknown {
  return mocks.pipeline.zincrby.mock.calls.find(([key]) =>
    String(key).startsWith(REDIS_KEYS.CLICK_VIDEO_PREFIX)
  )?.[2];
}

describe("POST /api/ping", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    await seed(SAVED_VIDEOS);
  });

  describe("YouTube", () => {
    it.each([
      "https://www.youtube.com/watch?v=ytvid1",
      "https://youtube.com/watch?v=ytvid1",
      "https://youtu.be/ytvid1",
      "https://www.youtube.com/live/ytvid1",
    ])("counts a click on %s", async (url) => {
      const response = await ping(url);

      expect(response.status).toBe(204);
      expect(countedVideoId()).toBe(youtubeVideo.video.id);
    });

    it.each([
      "https://www.youtube.com/watch",
      "https://youtu.be/",
      "https://www.youtube.com/@channel",
    ])("answers 422 for %s, which names no video", async (url) => {
      const response = await ping(url);

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });

    it("answers 422 for a video that is not saved", async () => {
      const response = await ping("https://www.youtube.com/watch?v=unknown");

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });
  });

  describe("Twitch", () => {
    it.each([
      ["https://www.twitch.tv/videos/2000000001", vod],
      ["https://m.twitch.tv/videos/2000000001", vod],
      ["https://clips.twitch.tv/FunnyClipSlug", clip],
      ["https://www.twitch.tv/foo_bar/clip/FunnyClipSlug", clip],
    ])("counts a click on %s", async (url, expected) => {
      const response = await ping(url);

      expect(response.status).toBe(204);
      expect(countedVideoId()).toBe(expected.video.id);
    });

    it("counts a click on a channel for the video live there", async () => {
      const live = createVideoOnTwitch(
        fooBar,
        { published_at: "2026-11-16T10:00:00Z", status: "LIVE" },
        { twitch_video_id: "live:123" }
      );

      await seed([...SAVED_VIDEOS, live]);

      const response = await ping("https://www.twitch.tv/foo_bar");

      expect(response.status).toBe(204);
      expect(countedVideoId()).toBe(live.video.id);
    });

    it("counts a click on a channel with no live video for its latest video", async () => {
      const latest = createVideoOnTwitch(
        fooBar,
        { published_at: "2026-11-16T15:00:00Z" },
        { twitch_video_id: "2000000003" }
      );

      await seed([...SAVED_VIDEOS, latest]);

      const response = await ping("https://www.twitch.tv/foo_bar");

      expect(response.status).toBe(204);
      expect(countedVideoId()).toBe(latest.video.id);
    });

    it("finds the user whose login is exactly the one in the URL, read in lowercase", async () => {
      // `foo_bar` as a pattern would also match `fooxbar`.
      const response = await ping("https://www.twitch.tv/Foo_Bar");

      expect(response.status).toBe(204);
      expect(countedVideoId()).not.toBe(otherVideo.video.id);
    });

    it("does not count a click on a login with `_` for another user", async () => {
      await seed(SAVED_VIDEOS, [fooxbar]);

      const response = await ping("https://www.twitch.tv/foo_bar");

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });

    it("answers 422 for a channel that is not saved", async () => {
      const response = await ping("https://www.twitch.tv/unknown");

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });

    it("answers 422 for a channel with no videos", async () => {
      await seed(SAVED_VIDEOS, [
        createTwitchUser({ talent_id: talentA.id, twitch_login_name: "quiet" }),
      ]);

      const response = await ping("https://www.twitch.tv/quiet");

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });

    it.each([
      "https://www.twitch.tv/",
      "https://www.twitch.tv/directory",
      "https://www.twitch.tv/foo_bar/about",
      "https://clips.twitch.tv/",
    ])("answers 422 for %s, which names no video", async (url) => {
      const response = await ping(url);

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });

    it("answers 422 for a video that is not saved", async () => {
      const response = await ping("https://www.twitch.tv/videos/9999999999");

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    });
  });

  it("answers 422 for a host it does not know", async () => {
    const response = await ping("https://example.com/watch?v=ytvid1");

    expect(response.status).toBe(422);
    expect(mocks.pipeline.exec).not.toHaveBeenCalled();
  });

  it.each(["ftp://www.youtube.com/watch?v=ytvid1", "not a URL"])(
    "answers 422 for %s",
    async (url) => {
      const response = await ping(url);

      expect(response.status).toBe(422);
      expect(mocks.pipeline.exec).not.toHaveBeenCalled();
    }
  );

  it("answers 415 for a request that is not a ping", async () => {
    const response = await POST(
      new Request("https://shinju.date/api/ping", {
        body: "{}",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );

    expect(response.status).toBe(415);
  });

  it("adds 1 to the clicks of the video and the talent for the day in Japan", async () => {
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.Instant.from("2026-11-16T15:30:00Z").toZonedDateTimeISO(
        TIME_ZONE
      )
    );

    const response = await ping("https://www.twitch.tv/videos/2000000002");

    expect(response.status).toBe(204);

    const videoKey = `${REDIS_KEYS.CLICK_VIDEO_PREFIX}20261117`;
    const talentKey = `${REDIS_KEYS.CLICK_CHANNEL_PREFIX}20261117`;

    expect(mocks.pipeline.zincrby.mock.calls).toStrictEqual([
      [videoKey, 1, otherVideo.video.id],
      [talentKey, 1, talentB.id],
    ]);
    expect(mocks.pipeline.expire.mock.calls).toStrictEqual([
      [videoKey, 90 * 24 * 60 * 60],
      [talentKey, 90 * 24 * 60 * 60],
    ]);
    expect(mocks.pipeline.exec).toHaveBeenCalledOnce();
    expect(mocks.track).toHaveBeenCalledWith(
      "Link click",
      expect.objectContaining({
        provider: "Twitch",
        talent_id: talentB.id,
        url: "https://www.twitch.tv/videos/2000000002",
        video_id: otherVideo.video.id,
      }),
      { headers: expect.any(Headers) }
    );
  });
});
