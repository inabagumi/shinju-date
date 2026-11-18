import { describe, expect, it } from "vitest";

import { createFakeTwitchFetcher } from "../internal/testing/fetcher.js";
import {
  createClip,
  createSavedArchive,
  createSavedVideo,
  createVideo,
} from "../internal/testing/twitch.js";
import { createTwitchPlatform } from "./platform.js";

const now = Temporal.Instant.from("2024-05-01T12:00:00Z");

describe(createTwitchPlatform, () => {
  it("identifies a saved video by its Twitch video ID", () => {
    const { fetcher } = createFakeTwitchFetcher();
    const platform = createTwitchPlatform(fetcher);

    expect(platform.platform).toBe("twitch");
    expect(
      platform.getPlatformVideoId(
        createSavedArchive({ twitch_video: { twitch_video_id: "vod-1" } })
      )
    ).toBe("vod-1");
  });

  it("looks up videos with one call and reports the missing ones", async () => {
    const video = createVideo({ id: "vod-1" });
    const { fetcher, getClips, getVideos } = createFakeTwitchFetcher({
      missingVideoIds: ["vod-gone"],
      videos: [video],
    });

    const result = await createTwitchPlatform(fetcher).lookUp([
      createSavedArchive({ twitch_video: { twitch_video_id: "vod-1" } }),
      createSavedArchive({ twitch_video: { twitch_video_id: "vod-gone" } }),
    ]);

    expect(getVideos).toHaveBeenCalledExactlyOnceWith(["vod-1", "vod-gone"]);
    expect(getClips).toHaveBeenCalledExactlyOnceWith([]);
    expect(result).toStrictEqual({
      fetchedById: new Map([["vod-1", video]]),
      missingIds: ["vod-gone"],
    });
  });

  it("looks clips up separately from videos", async () => {
    const clip = createClip({ id: "clip-1" });
    const video = createVideo({ id: "vod-1" });
    const { fetcher, getClips, getVideos } = createFakeTwitchFetcher({
      clips: [clip],
      missingClipIds: ["clip-gone"],
      videos: [video],
    });

    const result = await createTwitchPlatform(fetcher).lookUp([
      createSavedArchive(),
      createSavedArchive({
        twitch_video: { twitch_video_id: "clip-1", type: "clip" },
      }),
      createSavedArchive({
        twitch_video: { twitch_video_id: "clip-gone", type: "clip" },
      }),
    ]);

    expect(getVideos).toHaveBeenCalledExactlyOnceWith(["vod-1"]);
    expect(getClips).toHaveBeenCalledExactlyOnceWith(["clip-1", "clip-gone"]);
    expect(result).toStrictEqual({
      fetchedById: new Map<string, unknown>([
        ["vod-1", video],
        ["clip-1", clip],
      ]),
      missingIds: ["clip-gone"],
    });
  });

  it("never looks up a broadcast that has no archive", async () => {
    const { fetcher, getClips, getVideos } = createFakeTwitchFetcher();

    const result = await createTwitchPlatform(fetcher).lookUp([
      createSavedVideo({ status: "ENDED" }),
    ]);

    expect(getVideos).toHaveBeenCalledExactlyOnceWith([]);
    expect(getClips).toHaveBeenCalledExactlyOnceWith([]);
    expect(result).toStrictEqual({ fetchedById: new Map(), missingIds: [] });
  });

  it("maps a video to its fields, as a standard video", () => {
    const { fetcher } = createFakeTwitchFetcher();

    expect(
      createTwitchPlatform(fetcher).toFields(createVideo(), now)
    ).toStrictEqual({
      duration: "PT2H",
      published_at: "2024-05-01T09:00:00Z",
      status: "ENDED",
      title: "Archive",
      video_kind: "standard",
    });
  });

  it("maps a clip to its fields, as a standard video", () => {
    const { fetcher } = createFakeTwitchFetcher();

    expect(
      createTwitchPlatform(fetcher).toFields(createClip(), now)
    ).toStrictEqual({
      duration: "PT30S",
      published_at: "2024-05-01T09:00:00Z",
      status: "PUBLISHED",
      title: "Clip",
      video_kind: "standard",
    });
  });
});
