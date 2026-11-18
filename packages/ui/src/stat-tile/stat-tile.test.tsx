import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatTile } from "./stat-tile";

describe(StatTile, () => {
  it("pairs the label with the value", () => {
    render(<StatTile label="動画の総数" value="12,345" />);

    expect(screen.getByRole("term")).toHaveTextContent("動画の総数");
    expect(screen.getByRole("definition")).toHaveTextContent("12,345");
    expect(screen.getByRole("definition")).toHaveClass("tabular-nums");
  });

  it("renders the change in the muted color by default", () => {
    render(<StatTile change="+0（前日比）" label="タレント" value="48" />);

    expect(screen.getByText("+0（前日比）")).toHaveClass("text-muted");
  });

  it.each([
    ["positive", "text-success"],
    ["negative", "text-danger"],
  ] as const)("colors a %s change with %s", (tone, className) => {
    render(
      <StatTile
        change="+3（前日比）"
        changeTone={tone}
        label="検索回数"
        value="8,912"
      />
    );

    expect(screen.getByText("+3（前日比）")).toHaveClass(className);
  });

  it("leaves out the change when not given", () => {
    render(<StatTile label="動画の総数" value="12,345" />);

    expect(screen.getAllByRole("definition")).toHaveLength(1);
  });
});
