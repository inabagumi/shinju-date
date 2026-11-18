import { describe, expect, it } from "vitest";

import type { VideoFields } from "../../types.js";
import { compareVideoFields, diffVideoFields } from "./diff-video-fields.js";

const saved: VideoFields = {
  duration: "PT1H",
  published_at: "2024-05-01T09:00:00+00:00",
  status: "ENDED",
  title: "Title",
  video_kind: "standard",
};

describe(diffVideoFields, () => {
  it("returns nothing when no field changed", () => {
    expect(diffVideoFields(saved, { ...saved })).toStrictEqual({});
  });

  it.each<[keyof VideoFields, VideoFields[keyof VideoFields]]>([
    ["duration", "PT2H"],
    ["published_at", "2024-05-01T09:00:01Z"],
    ["status", "PUBLISHED"],
    ["title", "Renamed"],
    ["video_kind", "short"],
  ])("returns %s with its next value when it changed", (key, value) => {
    expect(diffVideoFields(saved, { ...saved, [key]: value })).toStrictEqual({
      [key]: value,
    });
  });

  it("returns every field that changed, and only those", () => {
    expect(
      diffVideoFields(saved, { ...saved, duration: "PT2H", title: "Renamed" })
    ).toStrictEqual({ duration: "PT2H", title: "Renamed" });
  });

  it("treats the same instant written differently as unchanged", () => {
    expect(
      diffVideoFields(saved, {
        ...saved,
        published_at: "2024-05-01T09:00:00Z",
      })
    ).toStrictEqual({});
  });

  it("ignores differences finer than the seconds the database keeps", () => {
    expect(
      diffVideoFields(saved, {
        ...saved,
        published_at: "2024-05-01T09:00:00.999Z",
      })
    ).toStrictEqual({});
  });

  it("skips fields that are missing on either side", () => {
    const { video_kind: _, ...withoutKind } = saved;

    expect(
      diffVideoFields(withoutKind, { ...saved, video_kind: "short" })
    ).toStrictEqual({});
    expect(diffVideoFields(saved, { title: saved.title })).toStrictEqual({});
  });
});

describe(compareVideoFields, () => {
  it("lists the fields that changed, with their value on each side", () => {
    expect(
      compareVideoFields(saved, { ...saved, duration: "PT2H", status: "LIVE" })
    ).toStrictEqual({
      after: { duration: "PT2H", status: "LIVE" },
      before: { duration: "PT1H", status: "ENDED" },
    });
  });

  it("is empty on both sides when nothing changed", () => {
    expect(
      compareVideoFields(saved, {
        ...saved,
        published_at: "2024-05-01T09:00:00Z",
      })
    ).toStrictEqual({ after: {}, before: {} });
  });
});
