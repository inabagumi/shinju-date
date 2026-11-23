import { act, fireEvent, render } from "@testing-library/react";
import { cloneElement, forwardRef } from "react";
import type { ReactElement } from "react";
import type { ResponsiveContainerProps } from "recharts";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
          { height: 320, width: chartWidth }
        )
    ),
  };
});

const { VideoStatsChartUI } = await import("./video-stats-chart-ui");

const DATA = [
  { date: "11/08", netChange: 12 },
  { date: "11/09", netChange: -3 },
  { date: "11/10", netChange: 0 },
  { date: "11/11", netChange: null },
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

describe("VideoStatsChartUI", () => {
  beforeEach(() => {
    // The bars grow from 0 with an animation, which does not run in jsdom.
    // Recharts draws them at once when the reduced motion is preferred.
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

  it("colors the bars of the increase and the decrease", () => {
    render(<VideoStatsChartUI data={DATA} />);

    const bars = document.querySelectorAll(".recharts-bar-rectangle path");
    expect([...bars].map((bar) => bar.getAttribute("class"))).toStrictEqual([
      expect.stringContaining("text-success"),
      expect.stringContaining("text-danger"),
    ]);
  });

  it("labels the bars with the signed changes, except for the missing days", () => {
    render(<VideoStatsChartUI data={DATA} />);

    const labels = document.querySelectorAll(".recharts-label-list text");
    expect([...labels].map((label) => label.textContent)).toStrictEqual([
      "+12",
      "-3",
      "±0",
    ]);
  });

  it("shows the axis on both sides of 0 with the base line", async () => {
    render(<VideoStatsChartUI data={[{ date: "11/08", netChange: 12 }]} />);
    await waitForFrame();

    const ticks = document.querySelectorAll(".recharts-yAxis-tick-labels text");
    const values = [...ticks].map((tick) => tick.textContent);
    // Only the increase, but the axis goes to the same width below 0
    expect(values).toStrictEqual(["-12", "-6", "±0", "+6", "+12"]);
    expect(document.querySelector(".recharts-reference-line")).not.toBeNull();
  });

  it.each([
    [800, false],
    [320, true],
  ])(
    "shows all the dates at the width %d, aslant: %s",
    async (width, aslant) => {
      chartWidth = width;
      render(<VideoStatsChartUI data={DATA} />);
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
    [100, "11/08", "純増減 : +12 本"],
    [300, "11/09", "純増減 : -3 本"],
    [500, "11/10", "純増減 : ±0 本"],
    [700, "11/11", "純増減 : データなし"],
  ])("shows the change at %d in the tooltip", async (clientX, date, item) => {
    render(<VideoStatsChartUI data={DATA} />);

    const tooltip = await hover(clientX);

    expect(tooltip).toHaveTextContent(date);
    const items = tooltip?.querySelectorAll("li") ?? [];
    expect([...items].map((element) => element.textContent)).toStrictEqual([
      item,
    ]);
  });
});
