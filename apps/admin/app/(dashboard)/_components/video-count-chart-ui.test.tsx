import { act, fireEvent, render } from "@testing-library/react";
import { cloneElement, forwardRef } from "react";
import type { ReactElement } from "react";
import type { ResponsiveContainerProps } from "recharts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DailyCount } from "../_lib/daily-counts";

/** The width of the chart, which jsdom cannot measure */
let chartWidth = 800;

// jsdom は要素の大きさを測れないので、グラフに大きさを直接渡す
vi.mock(import("recharts"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    ResponsiveContainer: forwardRef<HTMLDivElement, ResponsiveContainerProps>(
      ({ children }, _ref) =>
        // oxlint-disable-next-line react/no-clone-element -- gives the chart a fixed size, as the real ResponsiveContainer does with cloneElement()
        cloneElement(
          children as ReactElement<{ height?: number; width?: number }>,
          { height: 192, width: chartWidth }
        )
    ),
  };
});

const { VideoCountChartUI } = await import("./video-count-chart-ui");

const DATA: DailyCount[] = [
  { count: 12, day: "2025-11-08" },
  { count: 0, day: "2025-11-09" },
  { count: null, day: "2025-11-10" },
  { count: 14, day: "2025-11-11" },
];

/** Wait for the next frame, where Recharts draws the axes and the tooltip. */
const waitForFrame = async () => {
  await act(async () => {
    const frame = Promise.withResolvers<number>();
    requestAnimationFrame(frame.resolve);
    await frame.promise;
  });
};

/** Hover the chart at `clientX` and return the tooltip shown. */
const hover = async (clientX: number): Promise<Element | null> => {
  const chart = document.querySelector(".recharts-wrapper");
  if (!chart) {
    throw new Error("The chart is not rendered");
  }
  fireEvent.mouseMove(chart, { clientX, clientY: 100 });
  await waitForFrame();

  return document.querySelector(".recharts-tooltip-wrapper");
};

const renderChart = (data: DailyCount[] = DATA) =>
  render(
    <VideoCountChartUI className="text-accent" data={data} label="配信予定" />
  );

const getYTicks = (): (string | null)[] =>
  [...document.querySelectorAll(".recharts-yAxis-tick-labels text")].map(
    (tick) => tick.textContent
  );

describe("VideoCountChartUI", () => {
  beforeEach(() => {
    // The line is drawn with an animation, which does not run in jsdom.
    // Recharts draws it at once when the reduced motion is preferred.
    vi.stubGlobal(
      "matchMedia",
      vi.fn<(query: string) => Partial<MediaQueryList>>((query) => ({
        addEventListener: vi.fn<MediaQueryList["addEventListener"]>(),
        matches: query === "(prefers-reduced-motion: reduce)",
        removeEventListener: vi.fn<MediaQueryList["removeEventListener"]>(),
      }))
    );

    return () => {
      vi.unstubAllGlobals();
      chartWidth = 800;
    };
  });

  it("draws a dot for each day with the count, in the color of the series", () => {
    renderChart();

    const dots = document.querySelectorAll(".recharts-line-dots circle");
    expect([...dots].map((dot) => dot.getAttribute("class"))).toStrictEqual(
      Array.from({ length: 3 }, () => expect.stringContaining("text-accent"))
    );
  });

  it("breaks the line at the missing day, instead of drawing it as 0", () => {
    renderChart();

    const path = document
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    // A line from 11/08 to 11/09, and a new line from 11/11
    expect(path?.match(/M/gu)).toHaveLength(2);
  });

  it("scales the axis to the counts, not from 0", async () => {
    renderChart([
      { count: 30, day: "2025-11-08" },
      { count: 33, day: "2025-11-09" },
      { count: 31, day: "2025-11-10" },
    ]);
    await waitForFrame();

    // Each step is a video, not 0 to the counts of 40,000
    expect(getYTicks()).toStrictEqual(["30", "31", "32", "33", "34"]);
  });

  it.each([
    ["flat", 5, ["3", "4", "5", "6", "7"]],
    // Not below 0 around the flat counts near 0
    ["flat at 1", 1, ["0", "1", "2", "3", "4"]],
    ["all 0", 0, ["0", "1", "2", "3", "4"]],
  ])(
    "shows the axis around the counts that are %s",
    async (_, count, ticks) => {
      renderChart([
        { count, day: "2025-11-08" },
        { count, day: "2025-11-09" },
      ]);
      await waitForFrame();

      expect(getYTicks()).toStrictEqual(ticks);
    }
  );

  it.each([
    [800, false],
    [320, true],
  ])(
    "shows all the dates at the width %d, aslant: %s",
    async (width, aslant) => {
      chartWidth = width;
      renderChart();
      await waitForFrame();

      const ticks = document.querySelectorAll(
        ".recharts-xAxis-tick-labels text"
      );
      expect([...ticks].map((tick) => tick.textContent)).toStrictEqual([
        "11/08",
        "11/09",
        "11/10",
        "11/11",
      ]);
      expect(
        [...ticks].map((tick) =>
          (tick.getAttribute("transform") ?? "").startsWith("rotate(-45,")
        )
      ).toStrictEqual(Array.from({ length: 4 }, () => aslant));
    }
  );

  it.each([
    [100, "2025/11/08（土）", "配信予定 : 12 本"],
    [350, "2025/11/09（日）", "配信予定 : 0 本"],
    [550, "2025/11/10（月）", "配信予定 : データなし"],
    [780, "2025/11/11（火）", "配信予定 : 14 本"],
  ])("shows the count at %d in the tooltip", async (clientX, day, item) => {
    renderChart();

    const tooltip = await hover(clientX);

    expect(tooltip).toHaveTextContent(day);
    const items = tooltip?.querySelectorAll("li") ?? [];
    expect([...items].map((element) => element.textContent)).toStrictEqual([
      item,
    ]);
  });
});
