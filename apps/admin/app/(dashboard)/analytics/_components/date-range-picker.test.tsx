import { TIME_ZONE } from "@shinju-date/constants";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import DateRangePicker from "./date-range-picker";

const PRESET_LABELS = ["過去7日間", "過去30日間", "過去90日間", "今月", "先月"];

function getPressedButtons() {
  return screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-pressed") === "true")
    .map((button) => button.textContent);
}

describe("DateRangePicker", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`)
    );
  });

  it("marks the preset that matches the current period as pressed", () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: "2026-11-14", startDate: "2026-10-16" }}
      />
    );

    expect(getPressedButtons()).toEqual(["過去30日間"]);
    expect(
      screen.getByRole("button", { name: "カスタム期間を選択" })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("marks every preset that resolves to the same period", () => {
    // On the 7th, "this month" covers the same days as "the past 7 days"
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-07T12:00:00[${TIME_ZONE}]`)
    );

    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: "2026-11-07", startDate: "2026-11-01" }}
      />
    );

    expect(getPressedButtons()).toEqual(["過去7日間", "今月"]);
  });

  it("marks the custom period button when no preset matches", () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: "2026-11-10", startDate: "2026-11-03" }}
      />
    );

    expect(getPressedButtons()).toEqual(["カスタム期間を選択"]);
    for (const label of PRESET_LABELS) {
      expect(screen.getByRole("button", { name: label })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    }
  });

  it("applies the range of the clicked preset", () => {
    const onChange = vi.fn();

    render(
      <DateRangePicker
        onChange={onChange}
        value={{ endDate: "2026-11-14", startDate: "2026-11-08" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "先月" }));

    expect(onChange).toHaveBeenCalledWith({
      endDate: "2026-10-31",
      startDate: "2026-10-01",
    });
  });

  it("starts editing a custom period from the current period", () => {
    render(
      <DateRangePicker
        onChange={vi.fn()}
        value={{ endDate: "2026-11-10", startDate: "2026-11-03" }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "カスタム期間を選択" }));

    expect(screen.getByLabelText("開始日")).toHaveValue("2026-11-03");
    expect(screen.getByLabelText("終了日")).toHaveValue("2026-11-10");
  });

  describe("custom period", () => {
    function applyCustomPeriod(startDate: string, endDate: string) {
      const onChange = vi.fn();

      render(
        <DateRangePicker
          onChange={onChange}
          value={{ endDate: "2026-11-10", startDate: "2026-11-03" }}
        />
      );

      fireEvent.click(
        screen.getByRole("button", { name: "カスタム期間を選択" })
      );
      fireEvent.change(screen.getByLabelText("開始日"), {
        target: { value: startDate },
      });
      fireEvent.change(screen.getByLabelText("終了日"), {
        target: { value: endDate },
      });
      fireEvent.click(screen.getByRole("button", { name: "適用" }));

      return onChange;
    }

    it("applies a period within the window", () => {
      const onChange = applyCustomPeriod("2026-08-17", "2026-11-14");

      expect(onChange).toHaveBeenCalledWith({
        endDate: "2026-11-14",
        startDate: "2026-08-17",
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it.each([
      [
        "a start after the end",
        "2026-11-10",
        "2026-11-09",
        "開始日は終了日より前である必要があります",
      ],
      [
        "a period longer than 90 days",
        "2026-08-16",
        "2026-11-14",
        "期間は最大90日間まで選択できます",
      ],
      [
        "a start before the window",
        "2026-08-16",
        "2026-11-13",
        "開始日は2026/08/17以降である必要があります",
      ],
      [
        "an end after today",
        "2026-11-10",
        "2026-11-15",
        "終了日は今日以降にできません",
      ],
      ["an empty start", "", "2026-11-10", "開始日を入力してください"],
      ["an empty end", "2026-11-03", "", "終了日を入力してください"],
      ["empty start and end", "", "", "開始日を入力してください"],
    ])("rejects %s", (_, startDate, endDate, message) => {
      const onChange = applyCustomPeriod(startDate, endDate);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(message);
    });
  });
});
