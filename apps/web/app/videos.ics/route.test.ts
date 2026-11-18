// @vitest-environment node
import type { logger } from "@shinju-date/logger";
import type { cacheTag } from "next/cache";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTalent,
  createVideo,
  createVideoOnYouTube,
  createYouTubeChannel,
} from "@/test/factories";
import {
  failSupabase,
  seedSupabase,
  setupSupabase,
  supabaseRequests,
  videoSeed,
} from "@/test/supabase";

import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  // Entries of the `'use cache'` functions, keyed by their arguments
  cacheEntries: new Map<string, unknown>(),
  logger: {
    debug: vi.fn<typeof logger.debug>(),
    error: vi.fn<typeof logger.error>(),
    info: vi.fn<typeof logger.info>(),
    warn: vi.fn<typeof logger.warn>(),
  },
}));

vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: mocks.logger,
}));

// Vitest does not run `'use cache'`, so serve the second call with the same
// arguments from the entry of the first, as Next.js does
vi.mock(import("@/lib/data/videos"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchCalendarVideos: (
      ...args: Parameters<typeof actual.fetchCalendarVideos>
    ) => {
      const key = JSON.stringify(args);

      if (!mocks.cacheEntries.has(key)) {
        mocks.cacheEntries.set(key, actual.fetchCalendarVideos(...args));
      }

      return mocks.cacheEntries.get(key) as ReturnType<
        typeof actual.fetchCalendarVideos
      >;
    },
  };
});

setupSupabase();

const talentA = createTalent({ name: "朝霧ミオ" });
const talentB = createTalent({ name: "風花リツ" });
const channelA = createYouTubeChannel({ talent_id: talentA.id });
const channelB = createYouTubeChannel({ talent_id: talentB.id });

const songA = createVideoOnYouTube(channelA, { title: "歌枠" });
const shortA = createVideoOnYouTube(channelA, {
  title: "ショート",
  video_kind: "short",
});
const songB = createVideoOnYouTube(channelB, { title: "歌ってみた" });
const shortB = createVideoOnYouTube(channelB, {
  title: "ショート動画",
  video_kind: "short",
});

const get = (search = ""): Promise<Response> =>
  GET(new NextRequest(`https://shinju.date/videos.ics${search}`));

/** The IDs of the videos of the events of a calendar, in its order */
const eventIds = async (response: Response): Promise<string[]> => {
  const text = await response.text();

  return [...text.matchAll(/^UID:(?<id>.+)@shinju\.date/gmu)].map(
    ({ groups: { id = "" } = {} }) => id
  );
};

/** The IDs of the events of the given videos, in any order */
const videoIds = (...rows: { video: { id: string } }[]): string[] =>
  rows.map(({ video }) => video.id);

describe("GET /videos.ics", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.cacheEntries.clear();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockImplementation((timeZone) =>
      Temporal.Instant.from("2026-11-15T03:20:00Z").toZonedDateTimeISO(
        timeZone ?? "UTC"
      )
    );

    await seedSupabase({
      talents: [talentA, talentB],
      youtubeChannels: [channelA, channelB],
      ...videoSeed([songA, shortA, songB, shortB]),
    });
  });

  it("returns the latest videos of every talent without parameters", async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=UTF-8"
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=900, stale-while-revalidate=3600"
    );

    const body = await response.clone().text();

    expect(body).toContain("SUMMARY:歌枠");
    const ids = await eventIds(response);

    expect(ids.toSorted()).toStrictEqual(
      videoIds(songA, shortA, songB, shortB).toSorted()
    );
  });

  it("returns the videos of the given talent", async () => {
    const response = await get(`?talent=${talentA.id}`);

    expect(response.status).toBe(200);
    const ids = await eventIds(response);

    expect(ids.toSorted()).toStrictEqual(videoIds(songA, shortA).toSorted());
  });

  it("returns the videos of any of the given talents", async () => {
    const otherTalent = createTalent();
    const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id });
    const otherVideo = createVideoOnYouTube(otherChannel);

    await seedSupabase({
      talents: [talentA, talentB, otherTalent],
      youtubeChannels: [channelA, channelB, otherChannel],
      ...videoSeed([songA, songB, otherVideo]),
    });

    const response = await get(
      `?talent=${talentB.id}&talent=${talentA.id.toUpperCase()}&talent=${talentB.id}`
    );

    const ids = await eventIds(response);

    expect(ids.toSorted()).toStrictEqual(videoIds(songA, songB).toSorted());
  });

  it("does not query Supabase again for the same conditions", async () => {
    await get(`?kind=short&talent=${talentB.id}&talent=${talentA.id}`);
    const response = await get(
      `?talent=${talentA.id.toUpperCase()}&talent=${talentB.id}&kind=short&talent=${talentA.id}`
    );

    expect(response.status).toBe(200);
    const ids = await eventIds(response);

    expect(ids.toSorted()).toStrictEqual(videoIds(shortA, shortB).toSorted());
    expect(supabaseRequests("videos")).toHaveLength(1);
  });

  it("queries Supabase again for other conditions", async () => {
    await get(`?talent=${talentA.id}`);
    await get(`?talent=${talentB.id}`);

    expect(supabaseRequests("videos")).toHaveLength(2);
  });

  it("leaves out the videos without a platform source", async () => {
    const withoutSource = createVideo({ talent_id: talentA.id });

    await seedSupabase({
      talents: [talentA],
      youtubeChannels: [channelA],
      ...videoSeed([songA, withoutSource]),
    });

    await expect(eventIds(await get())).resolves.toStrictEqual(videoIds(songA));
  });

  it.each([
    ["standard", [songA, songB]],
    ["short", [shortA, shortB]],
  ])("returns only the videos of kind=%s", async (kind, expected) => {
    const response = await get(`?kind=${kind}`);

    const ids = await eventIds(response);

    expect(ids.toSorted()).toStrictEqual(videoIds(...expected).toSorted());
  });

  it("treats an unknown kind as no kind", async () => {
    const response = await get("?kind=live");

    await expect(eventIds(response)).resolves.toHaveLength(4);
  });

  it("combines the talents and the kind", async () => {
    const response = await get(`?kind=short&talent=${talentA.id}`);

    await expect(eventIds(response)).resolves.toStrictEqual(videoIds(shortA));
  });

  it("returns a calendar without events when nothing matches", async () => {
    // The unknown talent still narrows the calendar instead of falling back
    const response = await get(`?talent=${createTalent().id}`);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("BEGIN:VCALENDAR");
    expect(body).not.toContain("BEGIN:VEVENT");
  });

  it.each([
    "?talent=abc",
    "?talent=",
    `?talent=${talentA.id}&talent=${talentB.id}x`,
  ])("answers 400 for talents that are not UUIDs (%s)", async (search) => {
    const response = await get(search);

    expect(response.status).toBe(400);
    expect(supabaseRequests()).toStrictEqual([]);
  });

  it("answers 500 when the videos cannot be fetched", async () => {
    failSupabase("videos", 'relation "videos" does not exist');

    const response = await get();

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.not.toContain("relation");
    expect(mocks.logger.error).toHaveBeenCalledOnce();
  });
});
