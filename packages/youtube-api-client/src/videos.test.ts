import { setTimeout as delay } from "node:timers/promises";

import type { youtube_v3 as youtube } from "@googleapis/youtube";
import { describe, expect, it, vi } from "vitest";

import type { RequestScheduler } from "./types.js";
import { getVideoIds, isFilteredYouTubeVideo } from "./videos.js";

describe(isFilteredYouTubeVideo, () => {
  const video = {
    contentDetails: {},
    id: "dQw4w9WgXcQ",
    snippet: { publishedAt: "2009-10-25T06:57:33Z" },
  } satisfies youtube.Schema$Video;

  it("accepts a video with an ID and a publication time", () => {
    expect(isFilteredYouTubeVideo(video)).toBeTruthy();
  });

  it("rejects a video without an ID", () => {
    expect(
      isFilteredYouTubeVideo({
        contentDetails: video.contentDetails,
        snippet: video.snippet,
      })
    ).toBeFalsy();
    expect(isFilteredYouTubeVideo({ ...video, id: null })).toBeFalsy();
  });

  it("rejects a video without a publication time", () => {
    expect(isFilteredYouTubeVideo({ ...video, snippet: {} })).toBeFalsy();
    expect(
      isFilteredYouTubeVideo({
        contentDetails: video.contentDetails,
        id: video.id,
      })
    ).toBeFalsy();
  });
});

/**
 * A client whose `videos.list` returns the requested IDs after a short
 * delay, and records how many requests ran at the same time at most.
 */
const createClient = () => {
  let running = 0;
  let peak = 0;
  const list = vi.fn<
    (params: {
      id?: string[];
    }) => Promise<{ data: youtube.Schema$VideoListResponse }>
  >(async ({ id = [] }) => {
    running += 1;
    peak = Math.max(peak, running);
    await delay(5);
    running -= 1;

    return { data: { items: id.map((value) => ({ id: value })) } };
  });

  return {
    client: { videos: { list } } as unknown as youtube.Youtube,
    list,
    peak: () => peak,
  };
};

const collect = async <T>(iterable: AsyncIterable<T>): Promise<T[]> => {
  const items: T[] = [];

  for await (const item of iterable) {
    items.push(item);
  }

  return items;
};

describe("lookups by ID", () => {
  const ids = Array.from({ length: 120 }, (_, i) => `v${i}`);

  it("requests the IDs in batches, one after another by default", async () => {
    const { client, list, peak } = createClient();

    await expect(collect(getVideoIds({ client, ids }))).resolves.toStrictEqual(
      ids
    );
    expect(list.mock.calls.map(([{ id }]) => id)).toStrictEqual([
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
      scheduled += 1;

      return request();
    };

    await expect(
      collect(getVideoIds({ client, ids, schedule }))
    ).resolves.toStrictEqual(ids);
    expect(scheduled).toBe(3);
    expect(list).toHaveBeenCalledTimes(3);
    expect(peak()).toBe(3);
  });

  it("makes no request without IDs", async () => {
    const { client, list } = createClient();

    await expect(
      collect(getVideoIds({ client, ids: [] }))
    ).resolves.toStrictEqual([]);
    expect(list).not.toHaveBeenCalled();
  });
});
