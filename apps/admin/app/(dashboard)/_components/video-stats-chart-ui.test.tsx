import { act, fireEvent, render, screen } from "@testing-library/react";
import { cloneElement, forwardRef } from "react";
import type { ReactElement } from "react";
import type { ResponsiveContainerProps } from "recharts";
import { describe, expect, it, vi } from "vitest";

// jsdom は要素の大きさを測れないので、グラフに大きさを直接渡す
vi.mock(import("recharts"), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    ResponsiveContainer: forwardRef<HTMLDivElement, ResponsiveContainerProps>(
      ({ children }, _ref) =>
        cloneElement(
          children as ReactElement<{ height?: number; width?: number }>,
          { height: 320, width: 800 }
        )
    ),
  };
});

const { VideoStatsChartUI } = await import("./video-stats-chart-ui");

const DATA = [
  {
    date: "2026-11-08",
    deletedVideos: 0,
    hiddenVideos: 1,
    scheduledVideos: 2,
    visibleVideos: 10,
  },
  {
    date: "2026-11-09",
    deletedVideos: 0,
    hiddenVideos: 3,
    scheduledVideos: 4,
    visibleVideos: 12,
  },
];

describe("VideoStatsChartUI", () => {
  it("colors each series and legend item with its class", () => {
    render(<VideoStatsChartUI data={DATA} />);

    const layers = document.querySelectorAll(".recharts-area");
    expect([...layers].map((layer) => layer.classList[2])).toStrictEqual([
      "text-success",
      "text-accent",
      "text-warning",
    ]);

    expect(screen.getByText("公開中").closest("li")).toHaveClass(
      "text-success"
    );
    expect(screen.getByText("配信予定").closest("li")).toHaveClass(
      "text-accent"
    );
    expect(screen.getByText("非表示").closest("li")).toHaveClass(
      "text-warning"
    );
  });

  it("colors each tooltip item with its class", async () => {
    render(<VideoStatsChartUI data={DATA} />);

    const chart = document.querySelector(".recharts-wrapper");
    if (!chart) {
      throw new Error("The chart is not rendered");
    }
    fireEvent.mouseMove(chart, { clientX: 700, clientY: 100 });
    await act(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        })
    );

    const tooltip = document.querySelector(".recharts-tooltip-wrapper");
    expect(tooltip).toHaveTextContent("2026-11-09");
    const items = tooltip?.querySelectorAll("li") ?? [];
    expect([...items].map((item) => item.textContent)).toStrictEqual([
      "公開中 : 12 本",
      "配信予定 : 4 本",
      "非表示 : 3 本",
    ]);
    expect(items[0]).toHaveClass("text-success");
  });
});
