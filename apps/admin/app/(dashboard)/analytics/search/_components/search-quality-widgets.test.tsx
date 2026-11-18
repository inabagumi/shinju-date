import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  getRepeatSearchRate,
  getSearchEngagementRate,
  getSearchExitRates,
} from "@/lib/analytics/get-search-quality-metrics";

import type { AnalyticsSearchParams } from "../../_lib/search-params-schema";

const mocks = vi.hoisted(() => ({
  getRepeatSearchRate: vi.fn<typeof getRepeatSearchRate>(),
  getSearchEngagementRate: vi.fn<typeof getSearchEngagementRate>(),
  getSearchExitRates: vi.fn<typeof getSearchExitRates>(),
}));

vi.mock(import("@/lib/analytics/get-search-quality-metrics"), () => ({
  getRepeatSearchRate: mocks.getRepeatSearchRate,
  getSearchEngagementRate: mocks.getSearchEngagementRate,
  getSearchExitRates: mocks.getSearchExitRates,
}));

const { RepeatSearchRateWidget } = await import("./repeat-search-rate-widget");
const { SearchEngagementRateWidget } =
  await import("./search-engagement-rate-widget");
const { SearchExitRateWidget } = await import("./search-exit-rate-widget");

function createSearchParams(): Promise<AnalyticsSearchParams> {
  return Promise.resolve({
    dateRange: { endDate: "2026-11-14", startDate: "2026-11-08" },
    selectedDate: null,
    tab: null,
  });
}

/** 見出しに続く凡例の文を、表示の順に返す */
function getLegend(title: string): string[] {
  const list = screen.getByText(title).closest("dl");

  return Array.from(list?.querySelectorAll("dd") ?? [], (item) =>
    (item.textContent ?? "").trim()
  );
}

describe("SearchExitRateWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [29.9, "良好"],
    [30, "普通"],
    [49.9, "普通"],
    [50, "注意"],
    [69.9, "注意"],
    [70, "要改善"],
  ])("rates an exit rate of %d%% as %s", async (exitRate, label) => {
    mocks.getSearchExitRates.mockResolvedValue([
      { exitRate, keyword: "keyword", searchCount: 10 },
    ]);

    render(await SearchExitRateWidget({ searchParams: createSearchParams() }));

    const [, row] = screen.getAllByRole("row");

    expect(within(row as HTMLElement).getByText(label)).toBeInTheDocument();
  });

  it("shows the legend from the best to the worst", async () => {
    mocks.getSearchExitRates.mockResolvedValue([]);

    render(await SearchExitRateWidget({ searchParams: createSearchParams() }));

    expect(getLegend("評価基準")).toStrictEqual([
      "30%未満: 良好",
      "30-49%: 普通",
      "50-69%: 注意",
      "70%以上: 要改善",
    ]);
  });
});

describe("SearchEngagementRateWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "no data" without a rating when there is no session', async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(null);

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("データなし")).toBeInTheDocument();
    expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/改善が必要\)/)).not.toBeInTheDocument();
  });

  it("shows the rate with its rating when there is data", async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(25);

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("検索利用率 (良好)")).toBeInTheDocument();
    expect(screen.queryByText("データなし")).not.toBeInTheDocument();
  });

  it.each([
    [9.9, "改善が必要"],
    [10, "平均的"],
    [19.9, "平均的"],
    [20, "良好"],
    [29.9, "良好"],
    [30, "優秀"],
  ])("rates an engagement rate of %d%% as %s", async (rate, label) => {
    mocks.getSearchEngagementRate.mockResolvedValue(rate);

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText(`検索利用率 (${label})`)).toBeInTheDocument();
  });

  it("shows the legend even when there is no data", async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(null);

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() })
    );

    expect(getLegend("判定基準")).toStrictEqual([
      "30%以上: 優秀",
      "20-29%: 良好",
      "10-19%: 平均的",
      "10%未満: 改善が必要",
    ]);
  });
});

describe("RepeatSearchRateWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "no data" without an interpretation when nobody searched', async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(null);

    render(
      await RepeatSearchRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("データなし")).toBeInTheDocument();
    expect(screen.queryByText("解釈:")).not.toBeInTheDocument();
    expect(screen.queryByText(/低い活動\)/)).not.toBeInTheDocument();
  });

  it("shows the rate with its interpretation when there is data", async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(2.5);

    render(
      await RepeatSearchRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("2.5")).toBeInTheDocument();
    expect(
      screen.getByText("回/セッション (適度なエンゲージメント)")
    ).toBeInTheDocument();
    expect(screen.getByText("解釈:")).toBeInTheDocument();
    expect(
      screen.getByText(/ユーザーは複数の検索を行いながら/)
    ).toBeInTheDocument();
  });

  it.each([
    [1.4, "低い活動"],
    [1.5, "標準的"],
    [1.9, "標準的"],
    [2, "適度なエンゲージメント"],
    [2.9, "適度なエンゲージメント"],
    [3, "高いエンゲージメント"],
  ])("rates %d searches per session as %s", async (rate, label) => {
    mocks.getRepeatSearchRate.mockResolvedValue(rate);

    render(
      await RepeatSearchRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText(`回/セッション (${label})`)).toBeInTheDocument();
  });

  it("shows the legend even when there is no data", async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(null);

    render(
      await RepeatSearchRateWidget({ searchParams: createSearchParams() })
    );

    expect(getLegend("参考基準")).toStrictEqual([
      "3.0回以上: 高いエンゲージメント",
      "2.0-2.9回: 適度なエンゲージメント",
      "1.5-1.9回: 標準的",
      "1.5回未満: 低い活動",
    ]);
  });
});
