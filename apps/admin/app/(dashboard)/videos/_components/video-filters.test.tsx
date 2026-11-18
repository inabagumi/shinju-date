import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VideoFilters } from "./video-filters";

const mocks = vi.hoisted(() => ({
  pathname: "/videos",
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));

type Rerender = ReturnType<typeof render>["rerender"];

function getSearchInput() {
  return screen.getByLabelText("タイトルまたはIDで検索");
}

/** 検索ボックスに入力し、URL に反映されるまで待つ */
function search(value: string) {
  fireEvent.change(getSearchInput(), { target: { value } });
  act(() => {
    vi.advanceTimersByTime(500);
  });
}

/** URL のパラメータが変わったときの再描画（「戻る」「進む」、リンク、自分の更新の反映） */
function navigate(rerender: Rerender, searchParams: string) {
  mocks.searchParams = new URLSearchParams(searchParams);
  rerender(<VideoFilters talents={[]} />);
}

describe("VideoFilters search", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.pathname = "/videos";
    mocks.searchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the search of the URL", () => {
    mocks.searchParams = new URLSearchParams("search=anime");

    render(<VideoFilters talents={[]} />);

    expect(getSearchInput()).toHaveValue("anime");
  });

  it("does not change the URL until the input is used", () => {
    mocks.searchParams = new URLSearchParams(
      "search=anime&talentId=123&page=3"
    );

    render(<VideoFilters talents={[]} />);
    act(() => {
      vi.runAllTimers();
    });

    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("updates the URL 500ms after the input stops", () => {
    mocks.searchParams = new URLSearchParams("status=LIVE&page=3");
    render(<VideoFilters talents={[]} />);

    fireEvent.change(getSearchInput(), { target: { value: "a" } });
    fireEvent.change(getSearchInput(), { target: { value: "anime" } });

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(mocks.replace).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Keeps the other filters and goes back to page 1
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith(
      "/videos?status=LIVE&search=anime"
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("removes the search from the URL when the input is cleared", () => {
    mocks.searchParams = new URLSearchParams("search=anime&status=LIVE");
    render(<VideoFilters talents={[]} />);

    search("");

    expect(mocks.replace).toHaveBeenCalledWith("/videos?status=LIVE");
  });

  it("builds the destination from the current pathname", () => {
    mocks.pathname = "/archive/videos";
    render(<VideoFilters talents={[]} />);

    search("anime");

    expect(mocks.replace).toHaveBeenCalledWith("/archive/videos?search=anime");
  });

  it("follows the URL when it changes outside the input", () => {
    mocks.searchParams = new URLSearchParams("search=B");
    const { rerender } = render(<VideoFilters talents={[]} />);

    navigate(rerender, "search=A");

    expect(getSearchInput()).toHaveValue("A");

    navigate(rerender, "");

    expect(getSearchInput()).toHaveValue("");
  });

  it("does not write the previous search back after going back", () => {
    const { rerender } = render(<VideoFilters talents={[]} />);

    search("A");
    expect(mocks.replace).toHaveBeenLastCalledWith("/videos?search=A");
    navigate(rerender, "search=A");

    search("B");
    expect(mocks.replace).toHaveBeenLastCalledWith("/videos?search=B");
    navigate(rerender, "search=B");

    mocks.replace.mockClear();

    // The browser goes back to `?search=A`
    navigate(rerender, "search=A");
    act(() => {
      vi.runAllTimers();
    });

    expect(getSearchInput()).toHaveValue("A");
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("drops the input that is waiting when the URL changes", () => {
    mocks.searchParams = new URLSearchParams("search=A");
    const { rerender } = render(<VideoFilters talents={[]} />);

    fireEvent.change(getSearchInput(), { target: { value: "B" } });
    navigate(rerender, "search=C");
    act(() => {
      vi.runAllTimers();
    });

    expect(getSearchInput()).toHaveValue("C");
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});

describe("VideoFilters toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/videos";
  });

  it("collapses the filter options until the toggle is pressed", () => {
    mocks.searchParams = new URLSearchParams();
    render(<VideoFilters talents={[]} />);

    const filterBar = screen.getByRole("group", { name: "絞り込み" });
    const toggle = screen.getByRole("button", { name: /^絞り込み/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(filterBar).toHaveAttribute("data-state", "closed");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(filterBar).toHaveAttribute("data-state", "open");
  });

  it("keeps the search input outside the collapsed options", () => {
    mocks.searchParams = new URLSearchParams();
    render(<VideoFilters talents={[]} />);

    expect(
      screen.getByRole("group", { name: "絞り込み" })
    ).not.toContainElement(screen.getByLabelText("タイトルまたはIDで検索"));
  });

  it("shows the number of applied filters on the toggle", () => {
    mocks.searchParams = new URLSearchParams(
      "status=LIVE&status=UPCOMING&platform=youtube&search=test"
    );
    render(<VideoFilters talents={[]} />);

    expect(
      screen.getByRole("button", { name: /^絞り込み.*2件適用中/ })
    ).toBeInTheDocument();
  });

  it("does not show a count when no filters are applied", () => {
    mocks.searchParams = new URLSearchParams("search=test");
    render(<VideoFilters talents={[]} />);

    expect(
      screen.getByRole("button", { name: /^絞り込み/ }).textContent
    ).not.toMatch(/件適用中/);
  });
});
