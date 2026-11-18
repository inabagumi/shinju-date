import type { youtube_v3 as youtube } from "@googleapis/youtube";
import { describe, expect, it, vi } from "vitest";

import type { RequestScheduler } from "./types.js";
import { getVideoIds, isFilteredYouTubeVideo } from "./videos.js";

describe("isFilteredYouTubeVideo", () => {
  const video = {
    contentDetails: {},
    id: "dQw4w9WgXcQ",
    snippet: { publishedAt: "2009-10-25T06:57:33Z" },
  } satisfies youtube.Schema$Video;

  it("accepts a video with an ID and a publication time", () => {
    expect(isFilteredYouTubeVideo(video)).toBe(true);
  });

  it("rejects a video without an ID", () => {
    expect(
      isFilteredYouTubeVideo({
        contentDetails: video.contentDetails,
        snippet: video.snippet,
      })
    ).toBe(false);
    expect(isFilteredYouTubeVideo({ ...video, id: null })).toBe(false);
  });

  it("rejects a video without a publication time", () => {
    expect(isFilteredYouTubeVideo({ ...video, snippet: {} })).toBe(false);
    expect(
      isFilteredYouTubeVideo({
        contentDetails: video.contentDetails,
        id: video.id,
      })
    ).toBe(false);
  });
});

describe("lookups by ID", () => {
  function createClient() {
    let running = 0;
    let peak = 0;
    const list = vi.fn(async ({ id = [] }: { id?: string[] }) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running--;

      return { data: { items: id.map((value) => ({ id: value })) } };
    });

    return {
      client: { videos: { list } } as unknown as youtube.Youtube,
      list,
      peak: () => peak,
    };
  }

  async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
    const items: T[] = [];

    for await (const item of iterable) {
      items.push(item);
    }

    return items;
  }

  const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);

  it("requests the IDs in batches, one after another by default", async () => {
    const { client, list, peak } = createClient();

    await expect(collect(getVideoIds({ client, ids }))).resolves.toEqual(ids);
    expect(list.mock.calls.map(([{ id }]) => id)).toEqual([
      ids.slice(0, 50),
      ids.slice(50, 100),
      ids.slice(100),
    ]);
    expect(peak()).toBe(1);
  });

  it("hands every batch to the scheduler and keeps their order", async () => {
    const { client, list, peak } = createClient();
    let scheduled = 0;
    const schedule: RequestScheduler = (request) => {
      scheduled++;

      return request();
    };

    await expect(
      collect(getVideoIds({ client, ids, schedule }))
    ).resolves.toEqual(ids);
    expect(scheduled).toBe(3);
    expect(list).toHaveBeenCalledTimes(3);
    expect(peak()).toBe(3);
  });

  it("makes no request without IDs", async () => {
    const { client, list } = createClient();

    await expect(collect(getVideoIds({ client, ids: [] }))).resolves.toEqual(
      []
    );
    expect(list).not.toHaveBeenCalled();
  });
});
