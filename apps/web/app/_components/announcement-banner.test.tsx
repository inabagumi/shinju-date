import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queryKeys } from "@/lib/query-keys";

import { AnnouncementBanner } from "./announcement-banner";
import type { RenderedAnnouncement } from "./announcement-message";

const actions = vi.hoisted(() => ({
  dismissAnnouncement: vi.fn(async () => {}),
  getRenderedAnnouncement: vi.fn(),
}));

vi.mock("../_lib/actions", () => actions);

function createAnnouncement(message: ReactNode): RenderedAnnouncement {
  return {
    id: "announcement-1",
    level: "info",
    message,
  };
}

function renderBanner(announcement: RenderedAnnouncement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AnnouncementBanner announcement={announcement} />
    </QueryClientProvider>
  );

  return { queryClient };
}

describe("AnnouncementBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show the message rendered on the server as it is", () => {
    renderBanner(
      createAnnouncement(
        <p>
          詳しくは<a href="https://example.com/">こちら</a>
        </p>
      )
    );

    const link = screen.getByRole("link", { name: "こちら" });

    expect(link).toHaveAttribute("href", "https://example.com/");
    expect(screen.getByTestId("announcement-banner")).toHaveTextContent(
      "詳しくはこちら"
    );
  });

  it("should show the new message after the refetch", async () => {
    actions.getRenderedAnnouncement.mockResolvedValue(
      createAnnouncement(
        <p>
          新しい<del>お知らせ</del>
        </p>
      )
    );

    const { queryClient } = renderBanner(
      createAnnouncement(<p>古いお知らせ</p>)
    );

    expect(screen.getByTestId("announcement-banner")).toHaveTextContent(
      "古いお知らせ"
    );

    await act(() =>
      queryClient.refetchQueries({ queryKey: queryKeys.announcement() })
    );

    await waitFor(() => {
      expect(screen.getByTestId("announcement-banner")).toHaveTextContent(
        "新しいお知らせ"
      );
    });
    expect(screen.getByText("お知らせ", { selector: "del" })).toBeVisible();
  });

  it("should hide the banner once the announcement has ended", async () => {
    actions.getRenderedAnnouncement.mockResolvedValue(null);

    const { queryClient } = renderBanner(
      createAnnouncement(<p>メンテナンスのお知らせ</p>)
    );

    expect(screen.getByTestId("announcement-banner")).toBeInTheDocument();

    await act(() =>
      queryClient.refetchQueries({ queryKey: queryKeys.announcement() })
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("announcement-banner")
      ).not.toBeInTheDocument();
    });
  });
});
