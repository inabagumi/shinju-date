import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import type { HydrationOptions, Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import type { InViewHookResponse } from "react-intersection-observer";
import { afterEach, describe, expect, it, vi } from "vitest";

import Timeline from "@/app/_components/timeline";
import ScheduleDayHeader from "@/app/schedule/_components/schedule-day-header";
import type { fetchVideos, Video } from "@/lib/data/videos";
import { createVideoItem } from "@/test/factories";

import FormattedTime from "./formatted-time";
import SearchResults from "./search-results";
import { TimerProvider } from "./timer";
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

/** The server renders a minute before the date changes in Japan */
const SERVER_NOW = "2026-12-31T23:59:00+09:00[Asia/Tokyo]";
/** The browser hydrates it a few minutes later, on the next day */
const BROWSER_NOW = "2027-01-01T00:01:00+09:00[Asia/Tokyo]";
/** The date the server renders with (`getReferenceDate`) */
const REFERENCE_DATE = "2026-12-31";

const mockNow = (value: string) => {
  vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
    Temporal.ZonedDateTime.from(value)
  );
};

/** The tree the page renders, as `app/layout.tsx` does */
const Page = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TimerProvider initialNow={SERVER_NOW}>{children}</TimerProvider>
    </QueryClientProvider>
  );
};

let root: Root | undefined;

/**
 * Render the tree on the server at `SERVER_NOW`, then hydrate it in the
 * browser at `BROWSER_NOW`. Returns the errors the hydration reported.
 */
const renderOnServerAndHydrate = async (children: ReactNode) => {
  mockNow(SERVER_NOW);

  const container = document.createElement("div");

  container.innerHTML = renderToString(<Page>{children}</Page>);
  document.body.append(container);

  mockNow(BROWSER_NOW);

  const onRecoverableError =
    vi.fn<NonNullable<HydrationOptions["onRecoverableError"]>>();
  const consoleError = vi.spyOn(console, "error");
  const serverHtml = container.innerHTML;

  await act(async () => {
    root = hydrateRoot(container, <Page>{children}</Page>, {
      onRecoverableError,
    });
  });

  return { consoleError, onRecoverableError, serverHtml };
};

describe("hydration across the change of the date", () => {
  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = undefined;
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("the search results", async () => {
    const { consoleError, onRecoverableError, serverHtml } =
      await renderOnServerAndHydrate(
        <SearchResults
          prefetchedData={[
            [
              // Asia/Tokyo: 2026-12-31 20:00
              createVideoItem({
                id: "video-a",
                published_at: "2026-12-31T11:00:00Z",
                title: "video-a",
              }),
            ],
          ]}
          referenceDate={REFERENCE_DATE}
        />
      );

    expect(serverHtml).toContain(">今日</time>");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    // The browser clock is used after the hydration
    expect(screen.getByRole("heading")).toHaveTextContent("昨日");
  });

  it("the timeline of the home page", async () => {
    const { consoleError, onRecoverableError, serverHtml } =
      await renderOnServerAndHydrate(
        <Timeline
          referenceDate={REFERENCE_DATE}
          videos={[
            // Asia/Tokyo: 2027-01-01 20:00
            createVideoItem({
              id: "video-a",
              published_at: "2027-01-01T11:00:00Z",
              title: "video-a",
            }),
          ]}
        />
      );

    expect(serverHtml).toContain(">明日</time>");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(
      within(screen.getByRole("region")).getByRole("heading")
    ).toHaveTextContent("今日");
  });

  it("the heading of a day on the schedule", async () => {
    const { consoleError, onRecoverableError, serverHtml } =
      await renderOnServerAndHydrate(
        <ScheduleDayHeader
          count={1}
          date="2027-01-01"
          headingId="day"
          referenceDate={REFERENCE_DATE}
        />
      );

    expect(serverHtml).not.toContain("今日");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(screen.getByText("今日")).toBeInTheDocument();
  });

  it("the year of a time", async () => {
    const { consoleError, onRecoverableError, serverHtml } =
      await renderOnServerAndHydrate(
        <FormattedTime
          dateTime={Temporal.ZonedDateTime.from(
            "2026-12-31T20:00:00+09:00[Asia/Tokyo]"
          )}
          options={{ dateStyle: "short", timeStyle: "short" }}
        />
      );

    expect(serverHtml).toContain(">12/31 20:00</time>");
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    // The year differs from that of the browser clock
    expect(screen.getByText("2026/12/31 20:00")).toBeInTheDocument();
  });
});
