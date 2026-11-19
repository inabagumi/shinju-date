import { renderHook } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppRouter } from "@/test/next-navigation";

import { useSelectedDateParam } from "./use-selected-date-param";

const mocks = vi.hoisted(() => ({
  push: vi.fn<AppRouter["push"]>(),
  searchParams: new URLSearchParams(),
}));

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/analytics/search",
  useRouter: () => ({ push: mocks.push }) as Partial<AppRouter> as AppRouter,
  useSearchParams: () => mocks.searchParams as ReadonlyURLSearchParams,
}));

describe(useSelectedDateParam, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
  });

  it("returns null when no day is selected", () => {
    const { result } = renderHook(() => useSelectedDateParam());

    expect(result.current.selectedDate).toBeNull();
  });

  it("returns the selected day from the URL", () => {
    mocks.searchParams = new URLSearchParams({ date: "2026-11-10" });

    const { result } = renderHook(() => useSelectedDateParam());

    expect(result.current.selectedDate).toBe("2026-11-10");
  });

  it("sets the day while keeping the other parameters", () => {
    mocks.searchParams = new URLSearchParams({
      from: "2026-11-08",
      to: "2026-11-14",
    });

    const { result } = renderHook(() => useSelectedDateParam());
    result.current.toggleDate("2026-11-10");

    expect(mocks.push).toHaveBeenCalledWith(
      "/analytics/search?from=2026-11-08&to=2026-11-14&date=2026-11-10"
    );
  });

  it("replaces the day when another day is selected", () => {
    mocks.searchParams = new URLSearchParams({ date: "2026-11-10" });

    const { result } = renderHook(() => useSelectedDateParam());
    result.current.toggleDate("2026-11-11");

    expect(mocks.push).toHaveBeenCalledWith(
      "/analytics/search?date=2026-11-11"
    );
  });

  it("clears the day when the selected day is selected again", () => {
    mocks.searchParams = new URLSearchParams({ date: "2026-11-10" });

    const { result } = renderHook(() => useSelectedDateParam());
    result.current.toggleDate("2026-11-10");

    expect(mocks.push).toHaveBeenCalledWith("/analytics/search");
  });
});
