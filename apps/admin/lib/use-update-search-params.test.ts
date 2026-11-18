import { renderHook } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppRouter } from "@/test/next-navigation";

import {
  useSearchParamsHref,
  useUpdateSearchParams,
} from "./use-update-search-params";

const mocks = vi.hoisted(() => ({
  pathname: "/videos",
  push: vi.fn<AppRouter["push"]>(),
  replace: vi.fn<AppRouter["replace"]>(),
  searchParams: new URLSearchParams(),
}));

vi.mock(import("next/navigation"), () => ({
  usePathname: () => mocks.pathname,
  useRouter: () =>
    ({
      push: mocks.push,
      replace: mocks.replace,
    }) as Partial<AppRouter> as AppRouter,
  useSearchParams: () => mocks.searchParams as ReadonlyURLSearchParams,
}));

function renderUpdate() {
  return renderHook(() => useUpdateSearchParams()).result.current;
}

describe(useUpdateSearchParams, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/videos";
    mocks.searchParams = new URLSearchParams();
  });

  it("sets a value with replace by default", () => {
    renderUpdate()({ search: "abc" });

    expect(mocks.replace).toHaveBeenCalledWith("/videos?search=abc");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("navigates with push when history is push", () => {
    renderUpdate()({ search: "abc" }, { history: "push" });

    expect(mocks.push).toHaveBeenCalledWith("/videos?search=abc");
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("builds the URL from the current pathname", () => {
    mocks.pathname = "/analytics/click";

    renderUpdate()({ tab: "talents" });

    expect(mocks.replace).toHaveBeenCalledWith("/analytics/click?tab=talents");
  });

  it("keeps the parameters that are not specified", () => {
    mocks.searchParams = new URLSearchParams(
      "search=old&talentId=1&talentId=2&sortField=published_at"
    );

    renderUpdate()({ search: "new" });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/videos?search=new&talentId=1&talentId=2&sortField=published_at"
    );
  });

  it("keeps a parameter whose value is undefined", () => {
    mocks.searchParams = new URLSearchParams("search=abc");

    renderUpdate()({ search: undefined, status: "LIVE" });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/videos?search=abc&status=LIVE"
    );
  });

  it("sets an array as multiple values with the same name", () => {
    mocks.searchParams = new URLSearchParams("status=UPCOMING&search=abc");

    renderUpdate()({ status: ["LIVE", "ENDED"] });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/videos?search=abc&status=LIVE&status=ENDED"
    );
  });

  it.each([
    ["null", null],
    ["an empty string", ""],
    ["an empty array", []],
  ])("removes the parameter when the value is %s", (_, value) => {
    mocks.searchParams = new URLSearchParams(
      "search=abc&status=LIVE&status=ENDED"
    );

    renderUpdate()({ search: value, status: value });

    expect(mocks.replace).toHaveBeenCalledWith("/videos");
  });

  it("removes page by default", () => {
    mocks.searchParams = new URLSearchParams("search=old&page=3");

    renderUpdate()({ search: "new" });

    expect(mocks.replace).toHaveBeenCalledWith("/videos?search=new");
  });

  it("keeps page when resetPage is false", () => {
    mocks.searchParams = new URLSearchParams("search=abc&page=3");

    renderUpdate()({ date: "2026-11-10" }, { resetPage: false });

    expect(mocks.replace).toHaveBeenCalledWith(
      "/videos?search=abc&page=3&date=2026-11-10"
    );
  });

  it("sets page when page is specified", () => {
    mocks.searchParams = new URLSearchParams("search=abc&page=3");

    renderUpdate()({ page: "4" }, { history: "push", resetPage: false });

    expect(mocks.push).toHaveBeenCalledWith("/videos?search=abc&page=4");
  });
});

describe(useSearchParamsHref, () => {
  beforeEach(() => {
    mocks.pathname = "/videos";
    mocks.searchParams = new URLSearchParams();
  });

  it("returns the URL without navigating", () => {
    mocks.searchParams = new URLSearchParams("search=abc&page=3");

    const { result } = renderHook(() => useSearchParamsHref());

    expect(result.current({ sortOrder: "asc" })).toBe(
      "/videos?search=abc&sortOrder=asc"
    );
    expect(result.current({ page: "4" }, { resetPage: false })).toBe(
      "/videos?search=abc&page=4"
    );
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
