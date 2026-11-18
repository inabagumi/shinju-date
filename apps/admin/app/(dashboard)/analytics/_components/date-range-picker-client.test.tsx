import { TIME_ZONE } from "@shinju-date/constants";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsSearchParams } from "../_lib/search-params-schema";
import { DateRangePickerClient } from "./date-range-picker-client";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/analytics/click",
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));

const DATE_RANGE = { endDate: "2026-11-14", startDate: "2026-11-08" };

async function renderPicker({
  selectedDate = null,
  tab = null,
}: Partial<Pick<AnalyticsSearchParams, "selectedDate" | "tab">> = {}) {
  const searchParams = Promise.resolve({
    dateRange: DATE_RANGE,
    selectedDate,
    tab,
  });

  await act(async () => {
    render(
      <Suspense fallback={null}>
        <DateRangePickerClient searchParams={searchParams} />
      </Suspense>
    );
  });
}

describe("DateRangePickerClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from(`2026-11-14T12:00:00[${TIME_ZONE}]`)
    );
    mocks.searchParams = new URLSearchParams();
  });

  it("does not show the comparison checkbox that has no effect", async () => {
    await renderPicker();

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("前期間と比較")).not.toBeInTheDocument();
  });

  it("keeps the selected tab when the period changes", async () => {
    mocks.searchParams = new URLSearchParams({ tab: "talents" });
    await renderPicker({ tab: "talents" });

    fireEvent.click(screen.getByRole("button", { name: "過去30日間" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/analytics/click?tab=talents&from=2026-10-16&to=2026-11-14"
    );
  });

  it("keeps the selected day when it is within the new period", async () => {
    mocks.searchParams = new URLSearchParams({
      date: "2026-11-10",
      from: DATE_RANGE.startDate,
      tab: "talents",
      to: DATE_RANGE.endDate,
    });
    await renderPicker({ selectedDate: "2026-11-10", tab: "talents" });

    fireEvent.click(screen.getByRole("button", { name: "過去30日間" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/analytics/click?date=2026-11-10&from=2026-10-16&tab=talents&to=2026-11-14"
    );
  });

  it("removes the selected day when it is outside the new period", async () => {
    mocks.searchParams = new URLSearchParams({
      date: "2026-11-10",
      from: DATE_RANGE.startDate,
      tab: "talents",
      to: DATE_RANGE.endDate,
    });
    await renderPicker({ selectedDate: "2026-11-10", tab: "talents" });

    fireEvent.click(screen.getByRole("button", { name: "先月" }));

    expect(mocks.replace).toHaveBeenCalledWith(
      "/analytics/click?from=2026-10-01&tab=talents&to=2026-10-31"
    );
  });
});
