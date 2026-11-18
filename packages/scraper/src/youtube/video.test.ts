import { describe, expect, it } from "vitest";

import { diffVideoFields } from "../internal/operations/diff-video-fields.js";
import { createVideo } from "../internal/testing/youtube.js";
import type { YouTubeVideo } from "./types.js";
import { getThumbnailSource, toVideoFields } from "./video.js";

const now = Temporal.Instant.from("2024-05-01T12:00:00Z");

/** An upload without thumbnails; the tests change it one field at a time. */
const upload = {
  contentDetails: { duration: "PT1H" },
  snippet: { publishedAt: "2024-04-30T10:00:00Z", title: "Title" },
};

describe(toVideoFields, () => {
  it("maps a regular upload", () => {
    expect(toVideoFields(createVideo(upload), now)).toStrictEqual({
      duration: "PT1H",
      published_at: "2024-04-30T10:00:00Z",
      status: "PUBLISHED",
      title: "Title",
      video_kind: "standard",
    });
  });

  it("maps a scheduled stream to its start time", () => {
    const video = createVideo({
      ...upload,
      contentDetails: {},
      liveStreamingDetails: { scheduledStartTime: "2024-05-02T09:00:00Z" },
    });

    expect(toVideoFields(video, now)).toMatchObject({
      duration: "P0D",
      published_at: "2024-05-02T09:00:00Z",
      status: "UPCOMING",
    });
  });

  it("maps a stream that is on air", () => {
    const video = createVideo({
      ...upload,
      liveStreamingDetails: {
        actualStartTime: "2024-05-01T11:00:00Z",
        scheduledStartTime: "2024-05-01T11:00:00Z",
      },
    });

    expect(toVideoFields(video, now).status).toBe("LIVE");
  });

  it("classifies short videos", () => {
    const video = createVideo({
      ...upload,
      contentDetails: { duration: "PT45S" },
    });

    expect(toVideoFields(video, now).video_kind).toBe("short");
  });
});

describe("the changes of a saved video", () => {
  const saved = toVideoFields(createVideo(upload), now);
  const getChanges = (
    savedFields: typeof saved,
    video: YouTubeVideo,
    at: Temporal.Instant
  ) => diffVideoFields(savedFields, toVideoFields(video, at));

  it("are empty when nothing changed", () => {
    expect(getChanges(saved, createVideo(upload), now)).toStrictEqual({});
  });

  it("ignores how the database formats the same instant", () => {
    expect(
      getChanges(
        { ...saved, published_at: "2024-04-30T10:00:00+00:00" },
        createVideo(upload),
        now
      )
    ).toStrictEqual({});
  });

  it("hold only the columns that changed", () => {
    const video = createVideo({
      ...upload,
      snippet: { publishedAt: "2024-04-30T10:00:00Z", title: "New title" },
    });

    expect(getChanges(saved, video, now)).toStrictEqual({ title: "New title" });
  });

  it("follows a stream from scheduled to ended", () => {
    const upcoming = toVideoFields(
      createVideo({
        ...upload,
        contentDetails: {},
        liveStreamingDetails: { scheduledStartTime: "2024-05-01T13:00:00Z" },
      }),
      now
    );
    const ended = createVideo({
      ...upload,
      contentDetails: { duration: "PT2H" },
      liveStreamingDetails: {
        actualEndTime: "2024-05-01T15:05:00Z",
        actualStartTime: "2024-05-01T13:05:00Z",
        scheduledStartTime: "2024-05-01T13:00:00Z",
      },
    });

    expect(
      getChanges(upcoming, ended, Temporal.Instant.from("2024-05-01T16:00:00Z"))
    ).toStrictEqual({
      duration: "PT2H",
      published_at: "2024-05-01T13:05:00Z",
      status: "ENDED",
    });
  });

  it("reclassifies a video once its duration is known", () => {
    const video = createVideo({
      ...upload,
      contentDetails: { duration: "PT30S" },
    });

    expect(getChanges(saved, video, now)).toStrictEqual({
      duration: "PT30S",
      video_kind: "short",
    });
  });
});

describe(getThumbnailSource, () => {
  const high = { height: 360, url: "https://i.ytimg.test/hq.jpg", width: 480 };
  const maxres = {
    height: 720,
    url: "https://i.ytimg.test/max.jpg",
    width: 1280,
  };

  it("prefers the largest thumbnail", () => {
    const video = createVideo({
      ...upload,
      snippet: {
        publishedAt: "2024-04-30T10:00:00Z",
        thumbnails: { high, maxres },
      },
    });

    expect(getThumbnailSource(video)).toStrictEqual(maxres);
  });

  it("falls back to smaller thumbnails", () => {
    const video = createVideo({
      ...upload,
      snippet: { publishedAt: "2024-04-30T10:00:00Z", thumbnails: { high } },
    });

    expect(getThumbnailSource(video)).toStrictEqual(high);
  });

  it("returns null when YouTube offers no usable thumbnail", () => {
    expect(getThumbnailSource(createVideo(upload))).toBeNull();
  });
});
