import { describe, expect, it } from "vitest";

import {
  getVideoKindName,
  getVideoKinds,
  getVideosCalendarPath,
  getVideosPath,
  parseVideoKindFilter,
} from "./video-kind-filter";

describe("parseVideoKindFilter", () => {
  it("should return the given kind", () => {
    expect(parseVideoKindFilter("short")).toBe("short");
    expect(parseVideoKindFilter("standard")).toBe("standard");
    expect(parseVideoKindFilter(["short", "standard"])).toBe("short");
  });

  it("should treat missing and unknown values as all", () => {
    expect(parseVideoKindFilter(undefined)).toBe("all");
    expect(parseVideoKindFilter("")).toBe("all");
    expect(parseVideoKindFilter("live")).toBe("all");
  });
});

describe("getVideoKinds", () => {
  it("should not filter for all", () => {
    expect(getVideoKinds("all")).toBeUndefined();
  });

  it("should filter by the given kind", () => {
    expect(getVideoKinds("short")).toEqual(["short"]);
    expect(getVideoKinds("standard")).toEqual(["standard"]);
  });
});

describe("getVideosPath", () => {
  it("should link to the videos page", () => {
    expect(getVideosPath("", "all")).toBe("/videos");
    expect(getVideosPath("", "short")).toBe("/videos?kind=short");
  });

  it("should link to the search results", () => {
    expect(getVideosPath("歌", "all")).toBe(
      `/videos/${encodeURIComponent("歌")}`
    );
    expect(getVideosPath("歌 枠", "standard")).toBe(
      `/videos/${encodeURIComponent("歌 枠")}?kind=standard`
    );
  });

  it("should keep the selected talents in sorted order", () => {
    const talentA = "0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01";
    const talentB = "7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02";

    expect(getVideosPath("", "all", [talentB, talentA, talentB])).toBe(
      `/videos?talent=${talentA}&talent=${talentB}`
    );
    expect(getVideosPath("歌", "short", [talentA])).toBe(
      `/videos/${encodeURIComponent("歌")}?kind=short&talent=${talentA}`
    );
    expect(getVideosPath("", "all", [])).toBe("/videos");
  });
});

describe("getVideosCalendarPath", () => {
  it("should link to the calendar of every video", () => {
    expect(getVideosCalendarPath("all")).toBe("/videos.ics");
    expect(getVideosCalendarPath("all", [])).toBe("/videos.ics");
  });

  it("should keep the kind and the talents in sorted order", () => {
    const talentA = "0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01";
    const talentB = "7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02";

    expect(getVideosCalendarPath("standard")).toBe("/videos.ics?kind=standard");
    expect(getVideosCalendarPath("short", [talentB, talentA, talentB])).toBe(
      `/videos.ics?kind=short&talent=${talentA}&talent=${talentB}`
    );
  });
});

describe("getVideoKindName", () => {
  it("should call all kinds videos", () => {
    expect(getVideoKindName("all")).toBe("動画");
  });

  it("should use the label of the kind", () => {
    expect(getVideoKindName("standard")).toBe("動画");
    expect(getVideoKindName("short")).toBe("ショート");
  });
});
