import type { SummaryStats, WithTrends } from "@shinju-date/dashboard-stats";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DailyCount } from "../_lib/daily-counts";
import type { DailyNetChange } from "../_lib/daily-net-changes";
import type {
  getHistoricalStats,
  HistoricalStatsEntry,
} from "../_lib/get-historical-stats";
import type { getSummaryStats } from "../_lib/get-summary-stats";

const mocks = vi.hoisted(() => ({
  getHistoricalStats: vi.fn<typeof getHistoricalStats>(),
  getSummaryStats: vi.fn<typeof getSummaryStats>(),
}));

/**
 * The parameters of the URL. Like Next.js, `useSearchParams()` follows the
 * URL changed with `window.history.replaceState()`.
 */
const url = vi.hoisted(() => {
  let searchParams = new URLSearchParams();
  const listeners = new Set<() => void>();

  return {
    get: () => searchParams,
    set: (next: URLSearchParams) => {
      searchParams = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
});

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/",
  useSearchParams: () =>
    // oxlint-disable-next-line react-hooks/rules-of-hooks -- the mock of a hook, called only from components
    useSyncExternalStore(url.subscribe, url.get) as ReadonlyURLSearchParams,
}));

vi.mock(import("../_lib/get-historical-stats"), () => ({
  getHistoricalStats: mocks.getHistoricalStats,
}));
vi.mock(import("../_lib/get-summary-stats"), () => ({
  getSummaryStats: mocks.getSummaryStats,
}));
vi.mock(import("./video-count-chart-ui"), () => ({
  // Lists the counts given to the chart of each count
  VideoCountChartUI: ({
    data,
    label,
  }: {
    data: DailyCount[];
    label: string;
  }) => (
    <ul aria-label={`chart of ${label}`}>
      {data.map(({ count, day }) => (
        <li key={day}>{`${day.slice(5)}: ${String(count)}`}</li>
      ))}
    </ul>
  ),
}));
vi.mock(import("./video-stats-chart-ui"), () => ({
  // Lists the values given to the chart
  VideoStatsChartUI: ({ data }: { data: DailyNetChange[] }) => (
    <ul aria-label="chart">
      {data.map(({ day, netChange }) => (
        <li key={day}>{`${day.slice(5)}: ${String(netChange)}`}</li>
      ))}
    </ul>
  ),
}));

const { ContentSummaryWidget, VideoSummaryWidget } =
  await import("./summary-widget");

const trend = (current: number, dayChange: number | null = null) => ({
  current,
  dayChange,
  weekChange: null,
});

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

/** The snapshot of a day with the total of the videos. */
const entry = (
  day: string,
  totalVideos: number | null,
  { hiddenVideos = 1, scheduledVideos = 5 } = {}
): HistoricalStatsEntry => ({
  day,
  stats:
    totalVideos === null
      ? null
      : {
          deletedVideos: 2,
          hiddenVideos,
          scheduledVideos,
          totalTalents: 12,
          totalTerms: 40,
          totalVideos,
          visibleVideos: totalVideos - 6,
        },
});

/**
 * The snapshots of the days up to `lastDay`, one for each total of the videos
 * (`null` for a day without the snapshot).
 */
const history = (
  lastDay: string,
  totals: readonly (number | null)[]
): HistoricalStatsEntry[] =>
  totals.map((totalVideos, index) =>
    entry(
      Temporal.PlainDate.from(lastDay)
        .subtract({ days: totals.length - 1 - index })
        .toString(),
      totalVideos
    )
  );

/** The totals of the videos, increasing by 1 each day */
const increasing = (days: number): number[] =>
  Array.from({ length: days }, (_, index) => 40_000 + index);

const getPeriodButton = (name: string): HTMLElement =>
  within(screen.getByRole("group", { name: "グラフの期間" })).getByRole(
    "button",
    { name }
  );

/** The names of the buttons of the periods that are pressed */
const getPressedPeriods = (): string[] =>
  within(screen.getByRole("group", { name: "グラフの期間" }))
    .getAllByRole("button", { pressed: true })
    .map((button) => button.textContent);

const getChartItems = (name: string): (string | null)[] =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((item) => item.textContent);

const getTile = (label: string): HTMLElement =>
  screen.getByRole("link", { name: new RegExp(`^${label}`, "u") });

describe("VideoSummaryWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSummaryStats.mockResolvedValue(stats);
    mocks.getHistoricalStats.mockResolvedValue([]);
    url.set(new URLSearchParams());
    vi.spyOn(window.history, "replaceState").mockImplementation(
      (_data, _unused, href) => {
        url.set(new URL(String(href), "http://localhost").searchParams);
      }
    );
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

  it("reads the snapshots of 31 days at once for the changes of up to 30 days", async () => {
    render(await VideoSummaryWidget());

    expect(mocks.getHistoricalStats.mock.calls).toStrictEqual([[31]]);
  });

  it("charts the daily net changes of the total of the videos", async () => {
    mocks.getHistoricalStats.mockResolvedValue([
      entry("2025-11-05", 40_000),
      entry("2025-11-06", 40_012),
      entry("2025-11-07", 40_009),
      entry("2025-11-08", 40_009),
      entry("2025-11-09", null),
      entry("2025-11-10", 40_020),
      entry("2025-11-11", 40_021),
      entry("2025-11-12", 40_025),
    ]);

    render(await VideoSummaryWidget());

    expect(
      screen.getByRole("heading", { name: "動画数の日別純増減（7日間）" })
    ).toBeDefined();
    expect(screen.getByText(/削除による減少を含む純増減/u)).toBeDefined();
    expect(getChartItems("chart")).toStrictEqual([
      "11-06: 12",
      "11-07: -3",
      "11-08: 0",
      "11-09: null",
      "11-10: null",
      "11-11: 1",
      "11-12: 4",
    ]);
  });

  it("shows the empty state without the snapshots of two days in a row", async () => {
    mocks.getHistoricalStats.mockResolvedValue([
      entry("2025-11-05", 40_000),
      entry("2025-11-06", null),
      entry("2025-11-07", 40_009),
      entry("2025-11-08", null),
      entry("2025-11-09", null),
      entry("2025-11-10", null),
      entry("2025-11-11", null),
      entry("2025-11-12", 40_025),
    ]);

    render(await VideoSummaryWidget());

    expect(screen.queryByRole("list", { name: "chart" })).toBeNull();
    expect(
      screen.getByText(/続けて2日分の集計が済むと、ここに日別の増減/u)
    ).toBeDefined();
    // A day with a snapshot is enough for the charts of the counts
    expect(getChartItems("chart of 配信予定")).toHaveLength(7);
    expect(getChartItems("chart of 非表示")).toHaveLength(7);
  });

  it("charts the counts of the scheduled and the hidden videos on their own", async () => {
    mocks.getHistoricalStats.mockResolvedValue([
      entry("2025-11-05", 40_000, { hiddenVideos: 99, scheduledVideos: 99 }),
      entry("2025-11-06", 40_012, { hiddenVideos: 30, scheduledVideos: 12 }),
      entry("2025-11-07", 40_009, { hiddenVideos: 31, scheduledVideos: 14 }),
      entry("2025-11-08", 40_009, { hiddenVideos: 31, scheduledVideos: 0 }),
      entry("2025-11-09", null),
      entry("2025-11-10", 40_020, { hiddenVideos: 28, scheduledVideos: 3 }),
      entry("2025-11-11", 40_021, { hiddenVideos: 28, scheduledVideos: 3 }),
      entry("2025-11-12", 40_025, { hiddenVideos: 29, scheduledVideos: 15 }),
    ]);

    render(await VideoSummaryWidget());

    expect(
      screen.getByRole("heading", { name: "配信予定の推移（7日間）" })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "非表示の推移（7日間）" })
    ).toBeDefined();
    expect(screen.getByText(/今日の本数はグラフに含めず/u)).toBeDefined();
    // The same 7 days as the net changes, without the base of the first one
    expect(getChartItems("chart of 配信予定")).toStrictEqual([
      "11-06: 12",
      "11-07: 14",
      "11-08: 0",
      "11-09: null",
      "11-10: 3",
      "11-11: 3",
      "11-12: 15",
    ]);
    expect(getChartItems("chart of 非表示")).toStrictEqual([
      "11-06: 30",
      "11-07: 31",
      "11-08: 31",
      "11-09: null",
      "11-10: 28",
      "11-11: 28",
      "11-12: 29",
    ]);
  });

  it("shows the empty states of all the charts without the snapshots", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      Array.from({ length: 8 }, (_, index) =>
        entry(`2025-11-${(index + 5).toString(10).padStart(2, "0")}`, null)
      )
    );

    render(await VideoSummaryWidget());

    expect(screen.queryAllByRole("list")).toStrictEqual([]);
    expect(
      screen.getAllByText("まだ集計されたデータがありません")
    ).toHaveLength(3);
  });

  it("charts 7 days first, with the period chosen", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());

    expect(getPressedPeriods()).toStrictEqual(["過去7日間"]);
    expect(getChartItems("chart")).toHaveLength(7);
    expect(getChartItems("chart")[0]).toBe("11-06: 1");
  });

  it("marks the period chosen as pressed", async () => {
    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    expect(getPressedPeriods()).toStrictEqual(["過去30日間"]);

    fireEvent.click(getPeriodButton("過去7日間"));

    expect(getPressedPeriods()).toStrictEqual(["過去7日間"]);
  });

  it.each([
    ["動画数の日別純増減（30日間）", "chart"],
    ["配信予定の推移（30日間）", "chart of 配信予定"],
    ["非表示の推移（30日間）", "chart of 非表示"],
  ])("switches the chart of %s to 30 days", async (heading, chart) => {
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    expect(screen.getByRole("heading", { name: heading })).toBeDefined();
    expect(getChartItems(chart)).toHaveLength(30);
  });

  it("charts the net changes of 30 days without reading the snapshots again", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    const netChanges = getChartItems("chart");
    // Compared with 10/13, the snapshot before the first day
    expect(netChanges[0]).toBe("10-14: 1");
    expect(netChanges.at(-1)).toBe("11-12: 1");
    expect(mocks.getHistoricalStats).toHaveBeenCalledOnce();
  });

  it("switches back to 7 days", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));
    fireEvent.click(getPeriodButton("過去7日間"));

    expect(getChartItems("chart")).toHaveLength(7);
    expect(
      screen.getByRole("heading", { name: "動画数の日別純増減（7日間）" })
    ).toBeDefined();
  });

  it("keeps the period chosen in the URL, without the other parameters lost", async () => {
    url.set(new URLSearchParams({ from: "dashboard" }));

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?from=dashboard&period=30"
    );

    fireEvent.click(getPeriodButton("過去7日間"));

    // The first period is the default, without the parameter
    expect(window.history.replaceState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?from=dashboard"
    );
  });

  it("charts the period in the URL", async () => {
    url.set(new URLSearchParams({ period: "30" }));
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());

    expect(getPressedPeriods()).toStrictEqual(["過去30日間"]);
    expect(getChartItems("chart")).toHaveLength(30);
    expect(
      screen.getByRole("heading", { name: "動画数の日別純増減（30日間）" })
    ).toBeDefined();
  });

  it("charts 7 days with a period in the URL that cannot be chosen", async () => {
    url.set(new URLSearchParams({ period: "14" }));
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());

    expect(getPressedPeriods()).toStrictEqual(["過去7日間"]);
    expect(getChartItems("chart")).toHaveLength(7);
  });

  it("does not change the tiles of the current counts with the period", async () => {
    mocks.getSummaryStats.mockResolvedValue({
      ...stats,
      totalVideos: trend(31, 3),
    });
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", increasing(31))
    );

    render(await VideoSummaryWidget());
    const before = getTile("総動画数").textContent;
    fireEvent.click(getPeriodButton("過去30日間"));

    expect(getTile("総動画数").textContent).toBe(before);
    expect(before).toContain("↑ 前日比: +3");
  });

  it("charts 30 days across the end of a year", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      history("2026-01-06", increasing(31))
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    const netChanges = getChartItems("chart");
    expect(netChanges[0]).toBe("12-08: 1");
    expect(netChanges).toContain("12-31: 1");
    expect(netChanges).toContain("01-01: 1");
    expect(netChanges.at(-1)).toBe("01-06: 1");
  });

  it("tells the days without the snapshots of 30 days, soon after the counting started", async () => {
    // The snapshots of the last 11 days only
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", [
        ...Array.from({ length: 20 }, () => null),
        ...increasing(11),
      ])
    );

    render(await VideoSummaryWidget());

    // Enough for 7 days
    expect(screen.queryByRole("status")).toBeNull();

    fireEvent.click(getPeriodButton("過去30日間"));

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("集計のない日があります");
    expect(notice).toHaveTextContent(
      "過去30日間のグラフに要る31日分（最初の日と比べる前日を含む）のうち、20日分の集計がありません。"
    );
  });

  it("does not chart the net changes without the snapshots to compare as 0", async () => {
    // The snapshots of the last 11 days only, from 11/02
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", [
        ...Array.from({ length: 20 }, () => null),
        ...increasing(11),
      ])
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    const netChanges = getChartItems("chart");
    // The first day with a snapshot has nothing to compare with
    expect(
      netChanges.slice(0, 20).filter((item) => !item?.endsWith(": null"))
    ).toStrictEqual([]);
    expect(netChanges[19]).toBe("11-02: null");
    expect(netChanges[20]).toBe("11-03: 1");
  });

  it("tells the day without the snapshot of the base of the first change", async () => {
    // The snapshot of the day before the first day of 7 days has expired
    mocks.getHistoricalStats.mockResolvedValue(
      history("2025-11-12", [...increasing(23), null, ...increasing(7)])
    );

    render(await VideoSummaryWidget());

    expect(screen.getByRole("status")).toHaveTextContent(
      "過去7日間のグラフに要る8日分（最初の日と比べる前日を含む）のうち、1日分の集計がありません。"
    );
    expect(getChartItems("chart")[0]).toBe("11-06: null");
  });

  it("shows the empty states instead of the notice without any snapshot of the period", async () => {
    mocks.getHistoricalStats.mockResolvedValue(
      history(
        "2025-11-12",
        Array.from({ length: 31 }, () => null)
      )
    );

    render(await VideoSummaryWidget());
    fireEvent.click(getPeriodButton("過去30日間"));

    expect(screen.queryByRole("status")).toBeNull();
    expect(
      screen.getAllByText("まだ集計されたデータがありません")
    ).toHaveLength(3);
  });
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
    expect(mocks.getSummaryStats.mock.calls).toStrictEqual([[], []]);
  });
});
