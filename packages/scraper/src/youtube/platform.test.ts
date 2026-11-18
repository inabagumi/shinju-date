import { describe, expect, it } from "vitest";

import { createFakeFetcher } from "../internal/testing/fetcher.js";
import { createSavedVideo, createVideo } from "../internal/testing/youtube.js";
import type { YouTubeFetcher } from "./fetcher.js";
import { createYouTubePlatform } from "./platform.js";

const now = Temporal.Instant.from("2024-05-01T12:00:00Z");

describe("createYouTubePlatform", () => {
  it("identifies a saved video by its YouTube video ID", () => {
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();
    const platform = createYouTubePlatform(fetcher);

    expect(platform.platform).toBe("youtube");
    expect(platform.getPlatformVideoId(createSavedVideo("yt-1"))).toBe("yt-1");
  });

  it("looks up videos with one call and reports the missing ones", async () => {
    const video = createVideo({ id: "yt-1" });
    const { fetcher, getVideos } = createFakeFetcher<YouTubeFetcher>({
      missingVideoIds: ["yt-gone"],
      videos: [video],
    });

    const result = await createYouTubePlatform(fetcher).lookUp([
      createSavedVideo("yt-1"),
      createSavedVideo("yt-gone"),
    ]);

    expect(getVideos).toHaveBeenCalledExactlyOnceWith(["yt-1", "yt-gone"]);
    expect(result).toEqual({
      fetchedById: new Map([["yt-1", video]]),
      missingIds: ["yt-gone"],
    });
  });

  it("checks for missing videos without fetching them", async () => {
    const { fetcher, findMissingVideoIds, getVideos } =
      createFakeFetcher<YouTubeFetcher>({ missingVideoIds: ["yt-gone"] });

    const missingIds = await createYouTubePlatform(fetcher).findMissing?.([
      createSavedVideo("yt-1"),
      createSavedVideo("yt-gone"),
    ]);

    expect(findMissingVideoIds).toHaveBeenCalledExactlyOnceWith([
      "yt-1",
      "yt-gone",
    ]);
    expect(getVideos).not.toHaveBeenCalled();
    expect(missingIds).toEqual(["yt-gone"]);
  });

  it("maps a video to its fields", () => {
    const { fetcher } = createFakeFetcher<YouTubeFetcher>();

    expect(
      createYouTubePlatform(fetcher).toFields(createVideo({ id: "yt-1" }), now)
    ).toEqual({
      duration: "PT10M",
      published_at: "2024-05-01T10:00:00Z",
      status: "PUBLISHED",
      title: "Video yt-1",
      video_kind: "standard",
    });
  });
});
