import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import type { InViewHookResponse } from "react-intersection-observer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchVideos } from "@/lib/data/videos";
import type { Video } from "@/lib/data/videos";
import { createVideoItem } from "@/test/factories";

import SearchResults from "./search-results";
import type { VideoCardSkeleton } from "./video-card";

vi.mock(import("@/lib/data/videos"), () => ({
  fetchVideos: vi.fn<typeof fetchVideos>(() => new Promise(() => {})),
}));

vi.mock(import("react-intersection-observer"), () => ({
  useInView: () =>
    ({
      inView: false,
      ref: () => {},
    }) as Partial<InViewHookResponse> as InViewHookResponse,
}));

vi.mock(import("./video-card"), () => ({
  default: ({ value }: { value: Video }) => <article>{value.title}</article>,
  // Renders nothing
  VideoCardSkeleton: vi.fn<typeof VideoCardSkeleton>(),
}));

const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe(SearchResults, () => {
  beforeEach(() => {
    // Asia/Tokyo: 2026-11-14 21:00
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-14T21:00:00+09:00[Asia/Tokyo]")
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should group the videos by date in Japan", () => {
    renderWithQueryClient(
      <SearchResults
        prefetchedData={[
          [
            // Asia/Tokyo: 2026-11-15 20:00
            createVideoItem({
              id: "video-a",
              published_at: "2026-11-15T11:00:00Z",
              title: "video-a",
            }),
            // Asia/Tokyo: 2026-11-14 22:00
            createVideoItem({
              id: "video-b",
              published_at: "2026-11-14T13:00:00Z",
              title: "video-b",
            }),
            // Asia/Tokyo: 2026-11-14 00:30
            createVideoItem({
              id: "video-c",
              published_at: "2026-11-13T15:30:00Z",
              title: "video-c",
            }),
            // Asia/Tokyo: 2026-11-13 23:30
            createVideoItem({
              id: "video-d",
              published_at: "2026-11-13T14:30:00Z",
              title: "video-d",
            }),
            // Asia/Tokyo: 2026-11-12 12:00
            createVideoItem({
              id: "video-e",
              published_at: "2026-11-12T03:00:00Z",
              title: "video-e",
            }),
            // Asia/Tokyo: 2025-12-31 12:00
            createVideoItem({
              id: "video-f",
              published_at: "2025-12-31T03:00:00Z",
              title: "video-f",
            }),
          ],
        ]}
        referenceDate="2026-11-14"
      />
    );

    const sections = screen.getAllByRole("region");

    expect(
      sections.map((section) => ({
        heading: within(section).getByRole("heading").textContent,
        titles: within(section)
          .getAllByRole("article")
          .map((card) => card.textContent),
      }))
    ).toStrictEqual([
      { heading: "明日", titles: ["video-a"] },
      { heading: "今日", titles: ["video-b", "video-c"] },
      { heading: "昨日", titles: ["video-d"] },
      { heading: "11月12日（木）", titles: ["video-e"] },
      { heading: "2025年12月31日（水）", titles: ["video-f"] },
    ]);
    expect(
      within(sections[1] as HTMLElement)
        .getByRole("heading")
        .querySelector("time")
    ).toHaveAttribute("dateTime", "2026-11-14");
  });

  it("should keep the date headings below the site header", () => {
    renderWithQueryClient(
      <SearchResults
        prefetchedData={[
          [
            createVideoItem({
              id: "video-a",
              published_at: "2026-11-14T11:00:00Z",
              title: "video-a",
            }),
          ],
        ]}
        referenceDate="2026-11-14"
      />
    );

    expect(screen.getByRole("heading", { name: "今日" })).toHaveClass(
      "sticky",
      "top-14"
    );
  });

  it("should render nothing without videos", () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <SearchResults prefetchedData={[[]]} referenceDate="2026-11-14" />
      </QueryClientProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should fetch the videos with the selected talents", () => {
    const talentIds = ["0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01"];

    renderWithQueryClient(
      <SearchResults
        kind="short"
        query="歌"
        referenceDate="2026-11-14"
        talentIds={talentIds}
      />
    );

    expect(fetchVideos).toHaveBeenCalledWith({
      kind: "short",
      query: "歌",
      talentIds,
      until: undefined,
    });
  });
});
