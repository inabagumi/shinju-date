import type { SummaryStats, WithTrends } from "@shinju-date/dashboard-stats";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getHistoricalStats: vi.fn(),
  getSummaryStats: vi.fn(),
}));

vi.mock("../_lib/get-historical-stats", () => ({
  getHistoricalStats: mocks.getHistoricalStats,
}));
vi.mock("../_lib/get-summary-stats", () => ({
  getSummaryStats: mocks.getSummaryStats,
}));
vi.mock("./video-stats-chart-ui", () => ({
  VideoStatsChartUI: () => null,
}));

const { ContentSummaryWidget, VideoSummaryWidget } =
  await import("./summary-widget");

function trend(current: number, dayChange: number | null = null) {
  return { current, dayChange, weekChange: null };
}

/** The counts of a day without the snapshots to compare with. */
const stats: WithTrends<SummaryStats> = {
  deletedVideos: trend(2),
  hiddenVideos: trend(1),
  scheduledVideos: trend(5),
  totalTalents: trend(12),
  totalTerms: trend(40),
  totalVideos: trend(31),
  visibleVideos: trend(25),
};

function getTile(label: string): HTMLElement {
  return screen.getByRole("link", { name: new RegExp(`^${label}`) });
}

describe("VideoSummaryWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummaryStats.mockResolvedValue(stats);
    mocks.getHistoricalStats.mockResolvedValue([]);
  });

  it.each([
    ["総動画数", "/videos?deleted=false"],
    [
      "公開中",
      "/videos?deleted=false&visible=true&status=ENDED&status=LIVE&status=PUBLISHED",
    ],
    ["配信予定", "/videos?deleted=false&visible=true&status=UPCOMING"],
    ["非表示", "/videos?deleted=false&visible=false"],
  ])("links the tile of %s to the videos it counts", async (label, href) => {
    render(await VideoSummaryWidget());

    expect(getTile(label).getAttribute("href")).toBe(href);
  });

  it("shows the changes from the day before", async () => {
    mocks.getSummaryStats.mockResolvedValue({
      ...stats,
      totalVideos: trend(31, 3),
      visibleVideos: trend(25, -2),
    });

    render(await VideoSummaryWidget());

    expect(getTile("総動画数").textContent).toContain("↑ 前日比: +3");
    expect(getTile("公開中").textContent).toContain("↓ 前日比: -2");
  });

  it.each([
    ["総動画数", "31"],
    ["公開中", "25"],
    ["配信予定", "5"],
    ["非表示", "1"],
  ])(
    "shows %s without a change on a day without the snapshots",
    async (label, value) => {
      render(await VideoSummaryWidget());

      const tile = within(getTile(label));

      expect(tile.getByText(value)).toBeDefined();
      expect(tile.getByText("前日比: データなし")).toBeDefined();
    }
  );
});

describe("ContentSummaryWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummaryStats.mockResolvedValue(stats);
    mocks.getHistoricalStats.mockResolvedValue([]);
  });

  it.each([
    ["総用語数", "40"],
    ["総タレント数", "12"],
  ])(
    "shows %s without a change on a day without the snapshots",
    async (label, value) => {
      render(await ContentSummaryWidget());

      const tile = within(getTile(label));

      expect(tile.getByText(value)).toBeDefined();
      expect(tile.getByText("前日比: データなし")).toBeDefined();
    }
  );

  it("reads the counts that the video summary reads", async () => {
    await Promise.all([VideoSummaryWidget(), ContentSummaryWidget()]);

    // The same call without arguments, which `'use cache: private'` of
    // `getSummaryStats` runs once for a display
    expect(mocks.getSummaryStats.mock.calls).toEqual([[], []]);
  });
});
