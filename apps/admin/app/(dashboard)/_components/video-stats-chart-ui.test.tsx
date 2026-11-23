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
  { day: "2025-11-08", netChange: 12 },
  { day: "2025-11-09", netChange: -3 },
  { day: "2025-11-10", netChange: 0 },
  { day: "2025-11-11", netChange: null },
];

/** The net changes of 30 days, from 2025-10-14 to 2025-11-12 */
const DATA_OF_30_DAYS = Array.from({ length: 30 }, (_, index) => ({
  day: Temporal.PlainDate.from("2025-10-14").add({ days: index }).toString(),
  netChange: index % 3 === 0 ? null : index - 10,
}));

const getXTicks = (): (string | null)[] =>
  [...document.querySelectorAll(".recharts-xAxis-tick-labels text")].map(
    (tick) => tick.textContent
  );

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
    render(<VideoStatsChartUI data={[{ day: "2025-11-08", netChange: 12 }]} />);
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
    [100, "2025/11/08（土）", "純増減 : +12 本"],
    [300, "2025/11/09（日）", "純増減 : -3 本"],
    [500, "2025/11/10（月）", "純増減 : ±0 本"],
    [700, "2025/11/11（火）", "純増減 : データなし"],
  ])("shows the change at %d in the tooltip", async (clientX, day, item) => {
    render(<VideoStatsChartUI data={DATA} />);

    const tooltip = await hover(clientX);

    expect(tooltip).toHaveTextContent(day);
    const items = tooltip?.querySelectorAll("li") ?? [];
    expect([...items].map((element) => element.textContent)).toStrictEqual([
      item,
    ]);
  });

  it("does not label the bars of 30 days, which would overlap", async () => {
    render(<VideoStatsChartUI data={DATA_OF_30_DAYS} />);
    await waitForFrame();

    expect(document.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(
      DATA_OF_30_DAYS.filter(({ netChange }) => netChange !== null).length
    );
    expect(document.querySelector(".recharts-label-list")).toBeNull();
  });

  it.each([
    [
      800,
      2,
      [
        "10/15",
        "10/17",
        "10/19",
        "10/21",
        "10/23",
        "10/25",
        "10/27",
        "10/29",
        "10/31",
        "11/02",
        "11/04",
        "11/06",
        "11/08",
        "11/10",
        "11/12",
      ],
    ],
    [
      320,
      3,
      [
        "10/16",
        "10/19",
        "10/22",
        "10/25",
        "10/28",
        "10/31",
        "11/03",
        "11/06",
        "11/09",
        "11/12",
      ],
    ],
  ])(
    "thins out the dates of 30 days at the width %d to every %d days, up to yesterday",
    async (width, _, ticks) => {
      chartWidth = width;
      render(<VideoStatsChartUI data={DATA_OF_30_DAYS} />);
      await waitForFrame();

      expect(getXTicks()).toStrictEqual(ticks);
    }
  );

  it("shows all the dates of 30 days on a wide chart", async () => {
    chartWidth = 1600;
    render(<VideoStatsChartUI data={DATA_OF_30_DAYS} />);
    await waitForFrame();

    expect(getXTicks()).toHaveLength(30);
  });

  it("shows the full date of a thinned-out day in the tooltip", async () => {
    render(<VideoStatsChartUI data={DATA_OF_30_DAYS} />);

    await waitForFrame();
    // 10/16, whose date is not on the axis
    const tooltip = await hover(80);

    expect(getXTicks()).not.toContain("10/16");
    expect(tooltip).toHaveTextContent("2025/10/16（木）");
  });
});
