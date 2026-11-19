import { describe, expect, it } from "vitest";

import { groupVideosByDate } from "./group-videos-by-date";

describe(groupVideosByDate, () => {
  it("should group the videos by the date in Japan, in the order of the start", () => {
    const groups = groupVideosByDate([
      { id: "c", published_at: "2026-11-11T13:00:00Z" },
      // 00:30 on 10 November in Japan
      { id: "b", published_at: "2026-11-09T15:30:00Z" },
      // 23:59 on 9 November in Japan
      { id: "a", published_at: "2026-11-09T14:59:00Z" },
      { id: "d", published_at: "2026-11-08T15:00:00Z" },
    ]);

    expect([...groups.keys()]).toStrictEqual([
      "2026-11-09",
      "2026-11-10",
      "2026-11-11",
    ]);
    expect(groups.get("2026-11-09")?.map((video) => video.id)).toStrictEqual([
      "d",
      "a",
    ]);
    expect(groups.get("2026-11-10")?.map((video) => video.id)).toStrictEqual([
      "b",
    ]);
    expect(groups.get("2026-11-11")?.map((video) => video.id)).toStrictEqual([
      "c",
    ]);
  });

  it("should not change the given videos", () => {
    const videos = [
      { id: "b", published_at: "2026-11-10T13:00:00Z" },
      { id: "a", published_at: "2026-11-10T12:00:00Z" },
    ];

    groupVideosByDate(videos);

    expect(videos.map((video) => video.id)).toStrictEqual(["b", "a"]);
  });

  it("should keep the given order with `sort: false`", () => {
    const groups = groupVideosByDate(
      [
        { id: "c", published_at: "2026-11-11T13:00:00Z" },
        { id: "b", published_at: "2026-11-10T13:00:00Z" },
        { id: "a", published_at: "2026-11-10T12:00:00Z" },
      ],
      { sort: false }
    );

    expect([...groups.keys()]).toStrictEqual(["2026-11-11", "2026-11-10"]);
    expect(groups.get("2026-11-10")?.map((video) => video.id)).toStrictEqual([
      "b",
      "a",
    ]);
  });
});
