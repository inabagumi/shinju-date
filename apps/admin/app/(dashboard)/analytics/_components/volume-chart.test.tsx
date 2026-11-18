import { act, fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsSearchParams } from "../_lib/search-params-schema";

const mocks = vi.hoisted(() => ({
  getClickVolume: vi.fn(),
  getSearchVolume: vi.fn(),
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics/click",
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/lib/analytics/get-click-volume", () => ({
  getClickVolume: mocks.getClickVolume,
}));

vi.mock("@/lib/analytics/get-search-volume", () => ({
  getSearchVolume: mocks.getSearchVolume,
}));

// jsdom は要素の大きさを測れないので、グラフに大きさを直接渡す
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();

  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ height?: number; width?: number }>;
    }) => cloneElement(children, { height: 256, width: 800 }),
  };
});

const { VolumeChart } = await import("./volume-chart");

const DATE_RANGE = { endDate: "2026-11-09", startDate: "2026-11-08" };

function createSearchParams(
  selectedDate: string | null = null
): Promise<AnalyticsSearchParams> {
  return Promise.resolve({ dateRange: DATE_RANGE, selectedDate, tab: null });
}

function getChart(): HTMLElement {
  const chart = document.querySelector<HTMLElement>(".recharts-wrapper");
  if (!chart) {
    throw new Error("The chart is not rendered");
  }
  return chart;
}

/** Recharts はマウスのイベントを次のフレームで処理する */
function waitForAnimationFrame(): Promise<void> {
  return act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      })
  );
}

/**
 * グラフの右半分（2日のうちの2日目）にマウスを乗せる
 */
async function hoverSecondDay(): Promise<void> {
  fireEvent.mouseMove(getChart(), { clientX: 700, clientY: 100 });
  await waitForAnimationFrame();
}

async function clickSecondDay(): Promise<void> {
  await hoverSecondDay();
  fireEvent.click(getChart(), { clientX: 700, clientY: 100 });
  await waitForAnimationFrame();
}

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

  it("shows the total clicks and a bar chart for the click kind", async () => {
    render(
      await VolumeChart({ kind: "click", searchParams: createSearchParams() })
    );

    expect(mocks.getClickVolume).toHaveBeenCalledWith({
      range: { end: DATE_RANGE.endDate, start: DATE_RANGE.startDate },
    });
    expect(mocks.getSearchVolume).not.toHaveBeenCalled();
    expect(screen.getByText("総クリック数")).toBeInTheDocument();
    expect(screen.getByText("1,201")).toBeInTheDocument();
    expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      2
    );
    // The series color comes from the class, not from the fill attribute
    expect(document.querySelector(".recharts-bar")).toHaveClass("text-accent");
    expect(document.querySelector(".recharts-area")).toBeNull();

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

  it("shows the total searches and an area chart for the search kind", async () => {
    render(
      await VolumeChart({ kind: "search", searchParams: createSearchParams() })
    );

    expect(mocks.getSearchVolume).toHaveBeenCalledWith({
      range: { end: DATE_RANGE.endDate, start: DATE_RANGE.startDate },
    });
    expect(mocks.getClickVolume).not.toHaveBeenCalled();
    expect(screen.getByText("総検索数")).toBeInTheDocument();
    expect(screen.getByText("4,530")).toBeInTheDocument();
    expect(document.querySelector(".recharts-bar")).toBeNull();

    const area = document.querySelector(".recharts-area-area");
    const gradientId = area?.getAttribute("fill")?.match(/^url\(#(.+)\)$/)?.[1];
    expect(gradientId).toBeDefined();
    const gradient = document.getElementById(gradientId ?? "");
    expect(gradient?.tagName.toLowerCase()).toBe("lineargradient");
    expect(gradient).toHaveClass("text-accent");
    // The series color comes from the class, not from the stroke attribute
    expect(document.querySelector(".recharts-area")).toHaveClass("text-accent");
    expect(document.querySelector(".recharts-area-curve")).toHaveAttribute(
      "stroke",
      "currentColor"
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

    expect(mocks.push).toHaveBeenCalledOnce();
    expect(mocks.push).toHaveBeenCalledWith(
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
