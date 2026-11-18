// @vitest-environment node
import type { logger } from "@shinju-date/logger";
import type { cacheTag } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTalent,
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

const mocks = vi.hoisted(() => {
  // Entries of the `'use cache'` functions, keyed by their arguments
  const cacheEntries = new Map<string, unknown>();

  // Vitest does not run `'use cache'`, so serve the second call with the same
  // arguments from the entry of the first, as Next.js does
  const cached =
    <Args extends unknown[], Result>(
      name: string,
      fn: (...args: Args) => Promise<Result>
    ): ((...args: Args) => Promise<Result>) =>
    (...args) => {
      const key = JSON.stringify([name, args]);

      if (!cacheEntries.has(key)) {
        cacheEntries.set(key, fn(...args));
      }

      return cacheEntries.get(key) as Promise<Result>;
    };

  return {
    cached,
    cacheEntries,
    logger: {
      debug: vi.fn<typeof logger.debug>(),
      error: vi.fn<typeof logger.error>(),
      info: vi.fn<typeof logger.info>(),
      warn: vi.fn<typeof logger.warn>(),
    },
  };
});

vi.mock(import("next/cache"), () => ({
  // A name of a profile or an object, which every overload of cacheLife takes
  cacheLife: vi.fn<(profile: string | object) => void>(),
  cacheTag: vi.fn<typeof cacheTag>(),
}));

vi.mock(import("@shinju-date/logger"), () => ({
  logger: mocks.logger,
}));

vi.mock(import("@/lib/data/videos"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchCalendarVideos: mocks.cached(
      "fetchCalendarVideos",
      actual.fetchCalendarVideos
    ),
  };
});

vi.mock(import("@/lib/data/talents"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    fetchTalent: mocks.cached("fetchTalent", actual.fetchTalent),
  };
});

import { GET } from "./route";

setupSupabase();

const talent = createTalent({ name: "朝霧ミオ" });
const otherTalent = createTalent({ name: "風花リツ" });
const channel = createYouTubeChannel({ talent_id: talent.id });
const otherChannel = createYouTubeChannel({ talent_id: otherTalent.id });

const song = createVideoOnYouTube(channel, { title: "歌枠" });
const short = createVideoOnYouTube(channel, {
  title: "ショート",
  video_kind: "short",
});
const otherSong = createVideoOnYouTube(otherChannel, { title: "歌ってみた" });

const get = (id: string): Promise<Response> =>
  GET(new Request(`https://shinju.date/talents/${id}.ics`), {
    params: Promise.resolve({ id }),
  });

/** The IDs of the videos of the events of a calendar, sorted */
const eventIds = async (response: Response): Promise<string[]> =>
  [...(await response.text()).matchAll(/^UID:(.+)@shinju\.date/gm)]
    .map(([, id]) => id ?? "")
    .toSorted();

describe("GET /talents/[id].ics", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.cacheEntries.clear();

    await seedSupabase({
      talents: [talent, otherTalent],
      youtubeChannels: [channel, otherChannel],
      ...videoSeed([song, short, otherSong]),
    });
  });

  it("returns the videos of every kind of the talent", async () => {
    const response = await get(talent.id);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/calendar; charset=UTF-8"
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=900, stale-while-revalidate=3600"
    );
    await expect(eventIds(response)).resolves.toStrictEqual(
      [song.video.id, short.video.id].toSorted()
    );
  });

  it("narrows the videos by the ID of the fetched talent", async () => {
    const response = await get(talent.id.toUpperCase());
    const [request] = supabaseRequests("videos");

    expect(response.status).toBe(200);
    await expect(eventIds(response)).resolves.toStrictEqual(
      [song.video.id, short.video.id].toSorted()
    );
    expect(request?.url.searchParams.get("talent_id")).toBe(
      `in.(${talent.id})`
    );
  });

  it("does not query Supabase again for the same talent", async () => {
    await get(talent.id);
    const response = await get(talent.id);

    expect(response.status).toBe(200);
    await expect(eventIds(response)).resolves.toContain(song.video.id);
    expect(supabaseRequests("talents")).toHaveLength(1);
    expect(supabaseRequests("videos")).toHaveLength(1);
  });

  it.each([
    ["does not exist", []],
    ["is retired", [{ ...talent, status: "retired" as const }]],
    ["is deleted", [{ ...talent, deleted_at: "2026-11-01T00:00:00Z" }]],
  ])("answers 404 for a talent that %s", async (_, talents) => {
    await seedSupabase({
      talents,
      youtubeChannels: [channel],
      ...videoSeed([song]),
    });

    const response = await get(talent.id);

    expect(response.status).toBe(404);
    expect(supabaseRequests("videos")).toStrictEqual([]);
  });

  it.each(["abc", "not-a-uuid", `${talent.id}x`])(
    "answers 404 for IDs that are not UUIDs (%s)",
    async (id) => {
      const response = await get(id);

      expect(response.status).toBe(404);
      expect(supabaseRequests()).toStrictEqual([]);
    }
  );

  it("answers 500 without the error message when the talent cannot be fetched", async () => {
    failSupabase("talents", 'relation "talents" does not exist');

    const response = await get(talent.id);

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.not.toContain("relation");
    expect(mocks.logger.error).toHaveBeenCalledOnce();
    expect(supabaseRequests("videos")).toStrictEqual([]);
  });

  it("answers 500 without the error message when the videos cannot be fetched", async () => {
    failSupabase("videos", 'relation "videos" does not exist');

    const response = await get(talent.id);

    expect(response.status).toBe(500);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.not.toContain("relation");
    expect(mocks.logger.error).toHaveBeenCalledOnce();
  });
});
