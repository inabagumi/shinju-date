import { render, screen } from "@testing-library/react";
import type { ResolvingMetadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchResultsSkeleton } from "@/components/search-results";
import type { fetchActiveTalents, Talent } from "@/lib/data/talents";
import type {
  countVideos,
  fetchCurrentTime,
  fetchVideos,
  Video,
} from "@/lib/data/videos";
import type { getDisplayRecommendationQueries } from "@/lib/recommendations/get-display-queries";

import type SearchExitTracker from "./_components/search-exit-tracker";
import type SearchQueryTracker from "./_components/search-query-tracker";
import type { VideoFiltersSkeleton } from "./_components/video-filters";
import {
  VideosPageHeading,
  VideosPageResults,
} from "./_components/videos-page-sections";
import { generateMetadata } from "./page";

const fetchers = vi.hoisted(() => ({
  countVideos: vi.fn<typeof countVideos>(),
  fetchActiveTalents: vi.fn<typeof fetchActiveTalents>(),
  fetchCurrentTime: vi.fn<typeof fetchCurrentTime>(
    async () => "2026-11-14T12:00:00+09:00[Asia/Tokyo]"
  ),
  fetchVideos: vi.fn<typeof fetchVideos>(),
}));

// The trackers render nothing, so the props they are rendered with are checked
const trackers = vi.hoisted(() => ({
  SearchExitTracker: vi.fn<typeof SearchExitTracker>(() => null),
  SearchQueryTracker: vi.fn<typeof SearchQueryTracker>(() => null),
}));

vi.mock(import("@/lib/data/talents"), () => ({
  fetchActiveTalents: fetchers.fetchActiveTalents,
}));

vi.mock(import("@/lib/data/videos"), () => ({
  countVideos: fetchers.countVideos,
  fetchCurrentTime: fetchers.fetchCurrentTime,
  fetchVideos: fetchers.fetchVideos,
}));

interface MockSearchResultsProps {
  talentIds?: string[];
}

interface MockVideoFiltersProps {
  selectedTalents: Talent[];
}

vi.mock(import("@/lib/recommendations/get-display-queries"), () => ({
  getDisplayRecommendationQueries: vi.fn<
    typeof getDisplayRecommendationQueries
  >(async () => []),
}));

vi.mock(import("./_components/search-query-tracker"), () => ({
  default: trackers.SearchQueryTracker,
}));

vi.mock(import("./_components/search-exit-tracker"), () => ({
  default: trackers.SearchExitTracker,
}));

vi.mock(import("@/components/search-results"), () => ({
  default: ({ talentIds }: MockSearchResultsProps) => (
    <div data-testid="search-results">{talentIds?.join(",")}</div>
  ),
  // Renders nothing
  SearchResultsSkeleton: vi.fn<typeof SearchResultsSkeleton>(),
}));

vi.mock(import("./_components/video-filters"), () => ({
  default: ({ selectedTalents }: MockVideoFiltersProps) => (
    <ul aria-label="選んでいるタレント">
      {selectedTalents.map((talent) => (
        <li key={talent.id}>{talent.name}</li>
      ))}
    </ul>
  ),
  // Renders nothing
  VideoFiltersSkeleton: vi.fn<typeof VideoFiltersSkeleton>(),
}));

const TALENT_A: Talent = {
  id: "0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01",
  name: "朝霧ミオ",
};
const TALENT_B: Talent = {
  id: "7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02",
  name: "白露ネネ",
};
const RETIRED_TALENT_ID = "00000000-0000-4000-8000-000000000000";

function createProps(
  queries: string[] | undefined,
  searchParams: Record<string, string | string[] | undefined> = {}
) {
  return {
    params: Promise.resolve(queries ? { queries } : {}),
    searchParams: Promise.resolve(searchParams),
  };
}

describe("VideosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchers.fetchActiveTalents.mockResolvedValue([TALENT_A, TALENT_B]);
    fetchers.fetchVideos.mockResolvedValue([{ id: "video-a" } as Video]);
    fetchers.countVideos.mockResolvedValue(1);
  });

  it("should fetch the videos of the selected talents", async () => {
    render(
      await VideosPageResults(
        createProps(["歌"], {
          kind: "short",
          talent: [TALENT_B.id, "abc", RETIRED_TALENT_ID, TALENT_A.id],
        })
      )
    );

    expect(fetchers.fetchVideos).toHaveBeenCalledWith({
      kind: "short",
      query: "歌",
      talentIds: [TALENT_A.id, TALENT_B.id],
    });
    expect(screen.getByTestId("search-results")).toHaveTextContent(
      `${TALENT_A.id},${TALENT_B.id}`
    );
  });

  it("should not track the keyword while filtering by talents", async () => {
    render(
      await VideosPageResults(createProps(["歌"], { talent: TALENT_A.id }))
    );

    expect(trackers.SearchQueryTracker).not.toHaveBeenCalled();
    expect(trackers.SearchExitTracker).not.toHaveBeenCalled();
  });

  it("should track the keyword without talents", async () => {
    render(await VideosPageResults(createProps(["歌"], { talent: "invalid" })));

    expect(fetchers.fetchVideos).toHaveBeenCalledWith({
      kind: "all",
      query: "歌",
      talentIds: [],
    });
    expect(trackers.SearchQueryTracker.mock.lastCall?.[0]).toStrictEqual({
      query: "歌",
      resultsCount: 1,
    });
    expect(trackers.SearchExitTracker.mock.lastCall?.[0]).toStrictEqual({
      hasResults: true,
      query: "歌",
    });
  });

  it("should offer to clear the talents when nothing matches", async () => {
    fetchers.fetchVideos.mockResolvedValue([]);

    render(
      await VideosPageResults(
        createProps(["歌"], { kind: "standard", talent: TALENT_A.id })
      )
    );

    expect(
      screen.getByText("条件に一致する動画は見つかりませんでした。")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "絞り込みを解除" })
    ).toHaveAttribute(
      "href",
      `/videos/${encodeURIComponent("歌")}?kind=standard`
    );
    expect(trackers.SearchQueryTracker).not.toHaveBeenCalled();
  });

  it("should not offer to clear the talents without talents", async () => {
    fetchers.fetchVideos.mockResolvedValue([]);

    render(await VideosPageResults(createProps(["歌"])));

    expect(
      screen.getByText("『歌』に一致する動画は見つかりませんでした。")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "絞り込みを解除" })
    ).not.toBeInTheDocument();
  });

  // 件数は Suspense の中で読み込むので、ここではスケルトンの有無で確かめる
  it("should show the selected talents and the count", async () => {
    render(
      await VideosPageHeading(
        createProps(undefined, { talent: [TALENT_B.id, TALENT_A.id] })
      )
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "動画一覧" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("banner").querySelector('[aria-hidden="true"]')
    ).toBeInTheDocument();
    expect(
      screen
        .getByRole("list", { name: "選んでいるタレント" })
        .querySelectorAll("li")
    ).toHaveLength(2);
  });

  it("should not show the count without a keyword or talents", async () => {
    render(await VideosPageHeading(createProps(undefined)));

    expect(
      screen.getByRole("banner").querySelector('[aria-hidden="true"]')
    ).not.toBeInTheDocument();
  });
});

describe(generateMetadata, () => {
  // The images of the parent segment are tested in `app/metadata.test.ts`
  function generatePageMetadata(props: Parameters<typeof generateMetadata>[0]) {
    return generateMetadata(
      props,
      Promise.resolve({} as Awaited<ResolvingMetadata>)
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();

    fetchers.fetchActiveTalents.mockResolvedValue([TALENT_A, TALENT_B]);
  });

  it("should index the videos page", async () => {
    const metadata = await generatePageMetadata(
      createProps(undefined, { kind: "short" })
    );

    expect(metadata.robots).toStrictEqual({ index: true });
    expect(metadata.alternates?.canonical).toBe("/videos");
    expect(metadata.alternates?.types).toStrictEqual({
      "text/calendar": "/videos.ics?kind=short",
    });
  });

  it("should offer the calendar of every video without filters", async () => {
    const metadata = await generatePageMetadata(createProps(undefined));

    expect(metadata.alternates?.types).toStrictEqual({
      "text/calendar": "/videos.ics",
    });
  });

  it("should not index the videos filtered by talents", async () => {
    const metadata = await generatePageMetadata(
      createProps(undefined, {
        kind: "standard",
        talent: [TALENT_B.id, TALENT_A.id],
      })
    );

    expect(metadata.robots).toStrictEqual({ index: false });
    expect(metadata.alternates?.canonical).toBe("/videos");
    expect(metadata.alternates?.types).toStrictEqual({
      "text/calendar": `/videos.ics?kind=standard&talent=${TALENT_A.id}&talent=${TALENT_B.id}`,
    });
  });

  it("should ignore unknown talents", async () => {
    const metadata = await generatePageMetadata(
      createProps(undefined, { talent: RETIRED_TALENT_ID })
    );

    expect(metadata.robots).toStrictEqual({ index: true });
    expect(metadata.alternates?.types).toStrictEqual({
      "text/calendar": "/videos.ics",
    });
  });

  it("should keep the canonical URL of the search results", async () => {
    const metadata = await generatePageMetadata(
      createProps(["歌"], { talent: TALENT_A.id })
    );

    expect(metadata.robots).toStrictEqual({ index: false });
    expect(metadata.alternates?.canonical).toBe(
      `/videos/${encodeURIComponent("歌")}`
    );
    expect(metadata.alternates?.types).toStrictEqual({ "text/calendar": null });
  });
});
