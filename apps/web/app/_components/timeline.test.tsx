import { render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VideoCardSkeleton } from "@/components/video-card";
import type { Video } from "@/lib/data/videos";
import { createVideoItem } from "@/test/factories";

import Timeline from "./timeline";

vi.mock(import("@/components/video-card"), () => ({
  default: ({ value }: { value: Video }) => <article>{value.title}</article>,
  // Renders nothing
  VideoCardSkeleton: vi.fn<typeof VideoCardSkeleton>(),
}));

function getGroup(name: RegExp | string) {
  return screen.getByRole("region", { name });
}

function getCardTitles(group: HTMLElement) {
  return within(group)
    .getAllByRole("article")
    .map((card) => card.textContent);
}

describe(Timeline, () => {
  beforeEach(() => {
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-14T12:00:00+09:00[Asia/Tokyo]")
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should keep each single-video date next to its own card", () => {
    render(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          // Asia/Tokyo: 2026-11-16 20:00
          createVideoItem({
            id: "video-c",
            published_at: "2026-11-16T11:00:00Z",
            title: "video-c",
          }),
          // Asia/Tokyo: 2026-11-14 20:00
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-14T11:00:00Z",
            title: "video-a",
          }),
          // Asia/Tokyo: 2026-11-15 20:00
          createVideoItem({
            id: "video-b",
            published_at: "2026-11-15T11:00:00Z",
            title: "video-b",
          }),
        ]}
      />
    );

    const groups = screen.getAllByRole("region");

    expect(groups).toHaveLength(3);
    expect(
      groups.map((group) => within(group).getByRole("heading").textContent)
    ).toStrictEqual(["今日", "明日", "11/16（月）"]);

    for (const [index, title] of ["video-a", "video-b", "video-c"].entries()) {
      const group = groups[index] as HTMLElement;

      expect(getCardTitles(group)).toStrictEqual([title]);
      expect(within(group).getByText("1件")).toBeInTheDocument();
    }
  });

  it("should group multiple videos on the same date in order of start time", () => {
    render(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          // Asia/Tokyo: 2026-11-15 00:30 (next day in JST)
          createVideoItem({
            id: "video-d",
            published_at: "2026-11-14T15:30:00Z",
            title: "video-d",
          }),
          // Asia/Tokyo: 2026-11-14 21:00
          createVideoItem({
            id: "video-c",
            published_at: "2026-11-14T12:00:00Z",
            title: "video-c",
          }),
          // Asia/Tokyo: 2026-11-14 18:00
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-14T09:00:00Z",
            title: "video-a",
          }),
          // Asia/Tokyo: 2026-11-14 19:00
          createVideoItem({
            id: "video-b",
            published_at: "2026-11-14T10:00:00Z",
            title: "video-b",
          }),
        ]}
      />
    );

    const firstGroup = getGroup("今日");
    const secondGroup = getGroup("明日");

    expect(getCardTitles(firstGroup)).toStrictEqual([
      "video-a",
      "video-b",
      "video-c",
    ]);
    expect(within(firstGroup).getByText("3件")).toBeInTheDocument();
    expect(getCardTitles(secondGroup)).toStrictEqual(["video-d"]);
    expect(within(secondGroup).getByText("1件")).toBeInTheDocument();
  });

  it("should place the date heading before its cards", () => {
    render(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-16T11:00:00Z",
            title: "video-a",
          }),
        ]}
      />
    );

    const group = getGroup("11/16（月）");
    const heading = within(group).getByRole("heading", { level: 3 });
    const [card] = within(group).getAllByRole("article");

    expect(
      heading.compareDocumentPosition(card as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(within(heading).getByText("11/16（月）")).toHaveAttribute(
      "dateTime",
      "2026-11-16"
    );
  });

  it("should show the start time next to each card", () => {
    render(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-14T11:00:00Z",
            title: "video-a",
          }),
        ]}
      />
    );

    const group = getGroup("今日");

    expect(within(group).getByText("20:00")).toHaveAttribute(
      "dateTime",
      "2026-11-14T20:00:00+09:00"
    );
  });

  it("should label dates from the reference date when rendered on the server", () => {
    // サーバーでキャッシュを作ったのは 2026-11-14 で、描画した時点では日付が変わっている
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-15T00:30:00+09:00[Asia/Tokyo]")
    );

    const html = renderToString(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-14T11:00:00Z",
            title: "video-a",
          }),
        ]}
      />
    );

    expect(html).toContain(">今日</time>");
  });

  it("should label dates from the current time after hydration", () => {
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-15T00:30:00+09:00[Asia/Tokyo]")
    );

    render(
      <Timeline
        referenceDate="2026-11-14"
        videos={[
          createVideoItem({
            id: "video-a",
            published_at: "2026-11-14T11:00:00Z",
            title: "video-a",
          }),
          createVideoItem({
            id: "video-b",
            published_at: "2026-11-15T11:00:00Z",
            title: "video-b",
          }),
        ]}
      />
    );

    expect(
      screen
        .getAllByRole("region")
        .map((group) => within(group).getByRole("heading").textContent)
    ).toStrictEqual(["11/14（土）", "今日"]);
  });
});
