import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsSearchParams } from "../../_lib/search-params-schema";

/**
 * 評価の表のしきい値を1つずつ変えて、3つのウィジェットの判定と凡例の両方が、
 * 表に合わせて変わることを確かめる
 */
const mocks = vi.hoisted(() => ({
  getRepeatSearchRate: vi.fn(),
  getSearchEngagementRate: vi.fn(),
  getSearchExitRates: vi.fn(),
}));

vi.mock("@/lib/analytics/get-search-quality-metrics", () => ({
  getRepeatSearchRate: mocks.getRepeatSearchRate,
  getSearchEngagementRate: mocks.getSearchEngagementRate,
  getSearchExitRates: mocks.getSearchExitRates,
}));

vi.mock("../_lib/metric-ratings", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../_lib/metric-ratings")>();

  const withMin = <R extends { min: number }>(
    ratings: readonly R[],
    from: number,
    to: number
  ) =>
    ratings.map((rating) =>
      rating.min === from ? { ...rating, min: to } : rating
    );

  return {
    ...original,
    ENGAGEMENT_RATE_RATINGS: withMin(original.ENGAGEMENT_RATE_RATINGS, 20, 25),
    EXIT_RATE_RATINGS: withMin(original.EXIT_RATE_RATINGS, 30, 40),
    REPEAT_SEARCH_RATE_RATINGS: withMin(
      original.REPEAT_SEARCH_RATE_RATINGS,
      1.5,
      1.2
    ),
  };
});

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

describe("the search metric widgets with changed thresholds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("moves both the badge and the legend of the exit rate", async () => {
    mocks.getSearchExitRates.mockResolvedValue([
      { exitRate: 35, keyword: "below", searchCount: 10 },
      { exitRate: 40, keyword: "boundary", searchCount: 10 },
    ]);

    render(await SearchExitRateWidget({ searchParams: createSearchParams() }));

    const [, below, boundary] = screen.getAllByRole("row");

    expect(within(below as HTMLElement).getByText("良好")).toBeInTheDocument();
    expect(
      within(boundary as HTMLElement).getByText("普通")
    ).toBeInTheDocument();
    expect(screen.getByText("40%未満: 良好")).toBeInTheDocument();
    expect(screen.getByText("40-49%: 普通")).toBeInTheDocument();
    expect(screen.queryByText("30%未満: 良好")).not.toBeInTheDocument();
  });

  it("moves both the rating and the legend of the engagement rate", async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(22);

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("検索利用率 (平均的)")).toBeInTheDocument();
    expect(screen.getByText("25-29%: 良好")).toBeInTheDocument();
    expect(screen.getByText("10-24%: 平均的")).toBeInTheDocument();
    expect(screen.queryByText("20-29%: 良好")).not.toBeInTheDocument();
  });

  it("moves both the rating and the legend of the repeat search rate", async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(1.3);

    render(
      await RepeatSearchRateWidget({ searchParams: createSearchParams() })
    );

    expect(screen.getByText("回/セッション (標準的)")).toBeInTheDocument();
    expect(screen.getByText("1.2-1.9回: 標準的")).toBeInTheDocument();
    expect(screen.getByText("1.2回未満: 低い活動")).toBeInTheDocument();
    expect(screen.queryByText("1.5回未満: 低い活動")).not.toBeInTheDocument();
  });
});
