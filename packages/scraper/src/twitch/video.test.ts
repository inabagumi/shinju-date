import { describe, expect, it } from "vitest";

import type { TwitchClip, TwitchStream, TwitchVideo } from "./types.js";
import {
  getThumbnailSource,
  getTwitchVideoKind,
  toClipFields,
  toLiveFields,
  toVideoFields,
} from "./video.js";

const video = {
  created_at: "2024-05-01T09:00:00Z",
  duration: "PT1H2M3S",
  published_at: "2024-05-01T09:00:05Z",
  title: "Archive",
  type: "archive",
} as TwitchVideo;

describe(getTwitchVideoKind, () => {
  it.each([
    ["archive", "stream"],
    [null, "stream"],
    ["highlight", "standard"],
    ["upload", "standard"],
    ["clip", "short"],
  ] as const)("classifies the type %s as %s", (type, kind) => {
    expect(getTwitchVideoKind(type)).toBe(kind);
  });
});

describe(toVideoFields, () => {
  it("maps a Helix video", () => {
    expect(toVideoFields(video)).toStrictEqual({
      duration: "PT1H2M3S",
      published_at: "2024-05-01T09:00:05Z",
      status: "ENDED",
      title: "Archive",
      video_kind: "stream",
    });
  });

  it("falls back to the creation time", () => {
    expect(toVideoFields({ ...video, published_at: "" }).published_at).toBe(
      "2024-05-01T09:00:00Z"
    );
  });

  it.each([
    ["highlight", "standard"],
    ["upload", "standard"],
  ] as const)("classifies a %s as %s", (type, kind) => {
    expect(toVideoFields({ ...video, type }).video_kind).toBe(kind);
  });
});

describe(toClipFields, () => {
  it("maps a clip, as a short", () => {
    const clip = {
      created_at: "2024-05-01T09:00:00.123Z",
      duration: "PT30S",
      title: "Clip",
    } as TwitchClip;

    expect(toClipFields(clip)).toStrictEqual({
      duration: "PT30S",
      published_at: "2024-05-01T09:00:00Z",
      status: "PUBLISHED",
      title: "Clip",
      video_kind: "short",
    });
  });
});

describe(toLiveFields, () => {
  it("maps a stream that is on air", () => {
    const stream = {
      started_at: "2024-05-01T09:00:00.123Z",
      title: "Live now",
    } as TwitchStream;

    expect(toLiveFields(stream)).toStrictEqual({
      duration: "P0D",
      published_at: "2024-05-01T09:00:00Z",
      status: "LIVE",
      title: "Live now",
      video_kind: "stream",
    });
  });
});

describe(getThumbnailSource, () => {
  it("resolves the size placeholders of a template URL", () => {
    expect(
      getThumbnailSource("https://cdn.test/thumb-%{width}x%{height}.jpg")
    ).toStrictEqual({
      height: 720,
      url: "https://cdn.test/thumb-1280x720.jpg",
      width: 1280,
    });
  });

  it("returns null while the broadcast has no thumbnail yet", () => {
    expect(getThumbnailSource("")).toBeNull();
  });

  it("returns null for the placeholder of a VOD that is still processing", () => {
    expect(
      getThumbnailSource(
        "https://vod-secure.twitch.tv/_404/404_processing_%{width}x%{height}.png"
      )
    ).toBeNull();
  });
});
