import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { cloneElement, forwardRef } from "react";
import type { ReactElement } from "react";
import type { ResponsiveContainerProps } from "recharts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { getClickVolume } from "@/lib/analytics/get-click-volume";
import type { getSearchVolume } from "@/lib/analytics/get-search-volume";
import type { AppRouter } from "@/test/next-navigation";

import type { AnalyticsSearchParams } from "../_lib/search-params-schema";

const mocks = vi.hoisted(() => ({
  getClickVolume: vi.fn<typeof getClickVolume>(),
  getSearchVolume: vi.fn<typeof getSearchVolume>(),
  push: vi.fn<AppRouter["push"]>(),
  searchParams: new URLSearchParams(),
}));

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/analytics/click",
  useRouter: () => ({ push: mocks.push }) as Partial<AppRouter> as AppRouter,
  useSearchParams: () => mocks.searchParams as ReadonlyURLSearchParams,
}));

vi.mock(import("@/lib/analytics/get-click-volume"), () => ({
  getClickVolume: mocks.getClickVolume,
}));

vi.mock(import("@/lib/analytics/get-search-volume"), () => ({
  getSearchVolume: mocks.getSearchVolume,
}));

// jsdom は要素の大きさを測れないので、グラフに大きさを直接渡す
vi.mock(import("recharts"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    ResponsiveContainer: forwardRef<HTMLDivElement, ResponsiveContainerProps>(
      ({ children }, _ref) =>
        cloneElement(
          children as ReactElement<{ height?: number; width?: number }>,
          { height: 256, width: 800 }
        )
    ),
  };
});

const { VolumeChart } = await import("./volume-chart");

const DATE_RANGE = { endDate: "2026-11-09", startDate: "2026-11-08" };

const createSearchParams = (
  selectedDate: string | null = null
): Promise<AnalyticsSearchParams> =>
  Promise.resolve({ dateRange: DATE_RANGE, selectedDate, tab: null });

const getChart = (): HTMLElement => {
  const chart = document.querySelector<HTMLElement>(".recharts-wrapper");
  if (!chart) {
    throw new Error("The chart is not rendered");
  }
  return chart;
};

/** Recharts はマウスのイベントを次のフレームで処理する */
const waitForAnimationFrame = (): Promise<void> =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      })
  );

/**
 * グラフの右半分（2日のうちの2日目）にマウスを乗せる
 */
const hoverSecondDay = async (): Promise<void> => {
  fireEvent.mouseMove(getChart(), { clientX: 700, clientY: 100 });
  await waitForAnimationFrame();
};

const clickSecondDay = async (): Promise<void> => {
  await hoverSecondDay();
  fireEvent.click(getChart(), { clientX: 700, clientY: 100 });
  await waitForAnimationFrame();
};

describe("VolumeChart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams({
      from: DATE_RANGE.startDate,
      to: DATE_RANGE.endDate,
    });
    mocks.getClickVolume.mockResolvedValue([
      { clicks: 1, date: "2026-11-08" },
      { clicks: 1200, date: "2026-11-09" },
    ]);
    mocks.getSearchVolume.mockResolvedValue([
      { count: 30, date: "2026-11-08" },
      { count: 4500, date: "2026-11-09" },
    ]);
  });

  it("fetches only the clicks for the click kind", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    expect(mocks.getClickVolume).toHaveBeenCalledWith({
      range: { end: DATE_RANGE.endDate, start: DATE_RANGE.startDate },
    });
    expect(mocks.getSearchVolume).not.toHaveBeenCalled();
  });

  it("shows the total clicks for the click kind", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    expect(screen.getByText("総クリック数")).toBeInTheDocument();
    expect(screen.getByText("1,201")).toBeInTheDocument();
  });

  it("draws a bar chart for the click kind", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      2
    );
    // The series color comes from the class, not from the fill attribute
    expect(document.querySelector(".recharts-bar")).toHaveClass("text-accent");
    expect(document.querySelector(".recharts-area")).toBeNull();
  });

  it("shows the clicks of the hovered day for the click kind", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    await hoverSecondDay();

    // The active day gets a muted background
    expect(document.querySelector(".recharts-tooltip-cursor")).toHaveClass(
      "fill-muted"
    );

    const tooltip = document.querySelector(".recharts-tooltip-wrapper");
    expect(tooltip).toHaveTextContent("2026/11/09");
    expect(tooltip).toHaveTextContent("クリック数");
    expect(tooltip).toHaveTextContent("1,200 回");
  });

  it("fetches only the searches for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    expect(mocks.getSearchVolume).toHaveBeenCalledWith({
      range: { end: DATE_RANGE.endDate, start: DATE_RANGE.startDate },
    });
    expect(mocks.getClickVolume).not.toHaveBeenCalled();
  });

  it("shows the total searches for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    expect(screen.getByText("総検索数")).toBeInTheDocument();
    expect(screen.getByText("4,530")).toBeInTheDocument();
  });

  it("draws an area chart filled with a gradient for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    expect(document.querySelector(".recharts-bar")).toBeNull();

    const area = document.querySelector(".recharts-area-area");
    const gradientId = area?.getAttribute("fill")?.match(/^url\(#(.+)\)$/)?.[1];
    expect(gradientId).toBeDefined();
    const gradient = document.getElementById(gradientId ?? "");
    expect(gradient?.tagName.toLowerCase()).toBe("lineargradient");
    expect(gradient).toHaveClass("text-accent");
  });

  it("colors the area with its class for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    // The series color comes from the class, not from the stroke attribute
    expect(document.querySelector(".recharts-area")).toHaveClass("text-accent");
    expect(document.querySelector(".recharts-area-curve")).toHaveAttribute(
      "stroke",
      "currentColor"
    );
  });

  it("shows the searches of the hovered day for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    await hoverSecondDay();

    // The active dot is drawn outside the series, so it has its own class
    expect(document.querySelector(".recharts-active-dot circle")).toHaveClass(
      "text-accent"
    );

    const tooltip = document.querySelector(".recharts-tooltip-wrapper");
    expect(tooltip).toHaveTextContent("検索数");
    expect(tooltip).toHaveTextContent("4,500 回");
  });

  it("selects the clicked day while keeping the period", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    await clickSecondDay();

    expect(mocks.push).toHaveBeenCalledExactlyOnceWith(
      "/analytics/click?from=2026-11-08&to=2026-11-09&date=2026-11-09"
    );
  });

  it("clears the selection when the selected day is clicked again", async () => {
    mocks.searchParams.set("date", "2026-11-09");

    render(
      await VolumeChart({
        kind: "search",
        searchParams: createSearchParams("2026-11-09"),
      })
    );

    expect(screen.getByText("選択された日付: 2026/11/09")).toBeInTheDocument();

    await clickSecondDay();

    expect(mocks.push).toHaveBeenCalledWith(
      "/analytics/click?from=2026-11-08&to=2026-11-09"
    );
  });

  it("shows zero without series when there is no data", async () => {
    mocks.getClickVolume.mockResolvedValue([]);

    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    expect(screen.getByText("総クリック数")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(document.querySelector(".recharts-bar-rectangle")).toBeNull();
    expect(screen.queryByText(/選択された日付/)).not.toBeInTheDocument();

    fireEvent.click(getChart(), { clientX: 700, clientY: 100 });
    await waitForAnimationFrame();

    expect(mocks.push).not.toHaveBeenCalled();
  });
});
