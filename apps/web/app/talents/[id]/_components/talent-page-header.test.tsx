import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TalentStreamStatus } from "@/lib/data/talents";
import { createTalentDetail } from "@/test/factories";

import { TalentPageHeader } from "./talent-page-header";

vi.mock(import("@/lib/data/talents"), () => ({}));

const TALENT_ID = "00000000-0000-4000-8000-000000000001";

const TALENT = createTalentDetail({
  id: TALENT_ID,
  name: "朝霧ミオ",
  theme_color: null,
  twitch_users: [
    {
      name: "朝霧ミオ",
      profile_image: null,
      twitch_login_name: "uruha",
      twitch_user_id: "100",
    },
  ],
  youtube_channels: [
    {
      name: "朝霧ミオ",
      profile_image: { blur_data_url: "", id: "icon-1" },
      youtube_channel_id: "UCuruha",
      youtube_handle: "@uruha",
    },
  ],
});

describe(TalentPageHeader, () => {
  it("should show the icon and the name as the page heading", () => {
    const { container } = render(<TalentPageHeader talent={TALENT} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "朝霧ミオ" })
    ).toBeInTheDocument();
    expect(screen.getByTestId("talent-icon")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(
      within(
        screen.getByRole("navigation", { name: "パンくずリスト" })
      ).getByText("朝霧ミオ")
    ).toBeInTheDocument();
  });

  it("should link back to the list of talents", () => {
    render(<TalentPageHeader talent={TALENT} />);

    const breadcrumbs = screen.getByRole("navigation", {
      name: "パンくずリスト",
    });

    expect(
      within(breadcrumbs).getByRole("link", { name: "タレント一覧" })
    ).toHaveAttribute("href", "/talents");
    expect(
      within(breadcrumbs).getByText("朝霧ミオ").closest("[aria-current]")
    ).toHaveAttribute("aria-current", "page");
  });

  it("should open the channels in a new tab", () => {
    render(<TalentPageHeader talent={TALENT} />);

    const youtubeLink = screen.getByRole("link", {
      name: "YouTube チャンネル",
    });
    const twitchLink = screen.getByRole("link", { name: "Twitch チャンネル" });

    expect(youtubeLink).toHaveAttribute(
      "href",
      "https://www.youtube.com/channel/UCuruha"
    );
    expect(twitchLink).toHaveAttribute("href", "https://www.twitch.tv/uruha");

    for (const link of [youtubeLink, twitchLink]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("should link to the calendar in the same tab", () => {
    render(<TalentPageHeader talent={TALENT} />);

    const calendarLink = screen.getByRole("link", { name: "カレンダーに登録" });

    expect(calendarLink).toHaveAttribute("href", `/talents/${TALENT_ID}.ics`);
    expect(calendarLink).not.toHaveAttribute("target");
  });

  it("should show the default icon for a talent without icons", () => {
    render(
      <TalentPageHeader
        talent={createTalentDetail({
          ...TALENT,
          twitch_users: [],
          youtube_channels: [],
        })}
      />
    );

    expect(screen.getByTestId("talent-default-icon")).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /チャンネル/u })).toHaveLength(
      0
    );
  });
});

describe("TalentPageHeader with the stream status", () => {
  const live: TalentStreamStatus = { isLive: true, nextStreamAt: null };
  // 2026-11-16 20:00 in Japan
  const upcoming: TalentStreamStatus = {
    isLive: false,
    nextStreamAt: "2026-11-16T11:00:00Z",
  };

  it("should show the ring and the badge while live", () => {
    render(<TalentPageHeader streamStatus={live} talent={TALENT} />);

    const badge = screen.getByText("配信中");

    expect(badge).toHaveClass(
      "rounded-control",
      "bg-live",
      "px-1.5",
      "py-0.5",
      "text-caption",
      "font-semibold",
      "text-live-foreground"
    );
    expect(screen.getByTestId("talent-icon")).toHaveClass(
      "ring-2",
      "ring-live",
      "ring-offset-2",
      "ring-offset-background"
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "朝霧ミオ" })
    ).not.toContainElement(badge);
    expect(screen.queryByText(/次回/u)).not.toBeInTheDocument();
  });

  it("should not show the next stream while live", () => {
    render(
      <TalentPageHeader
        streamStatus={{ isLive: true, nextStreamAt: "2026-11-16T11:00:00Z" }}
        talent={TALENT}
      />
    );

    expect(screen.getByText("配信中")).toBeInTheDocument();
    expect(screen.queryByText(/次回/u)).not.toBeInTheDocument();
  });

  it("should show the start of the next stream in Japan time", () => {
    render(<TalentPageHeader streamStatus={upcoming} talent={TALENT} />);

    const nextStream = screen.getByText(/^次回/u);

    expect(nextStream).toHaveTextContent("次回 11/16 20:00");
    expect(nextStream).toHaveClass("text-meta", "text-muted", "tabular-nums");
    expect(nextStream).not.toHaveClass("text-caption");
    expect(nextStream.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-11-16T20:00:00+09:00"
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "朝霧ミオ" })
    ).not.toContainElement(nextStream);
  });

  it("should not show the live status before the next stream", () => {
    render(<TalentPageHeader streamStatus={upcoming} talent={TALENT} />);

    expect(screen.queryByText("配信中")).not.toBeInTheDocument();
    expect(screen.getByTestId("talent-icon")).not.toHaveClass("ring-live");
  });

  it("should put the stream status above the links", () => {
    render(<TalentPageHeader streamStatus={upcoming} talent={TALENT} />);

    const line = screen.getByText(/^次回/u).closest("p");
    const links = screen.getByRole("navigation", { name: "リンク" });

    expect(line).toHaveClass("mb-2");
    expect(line?.nextElementSibling).toBe(links);
  });

  it("should show nothing without a stream", () => {
    const { container } = render(<TalentPageHeader talent={TALENT} />);

    expect(screen.queryByText("配信中")).not.toBeInTheDocument();
    expect(screen.queryByText(/次回/u)).not.toBeInTheDocument();
    expect(screen.getByTestId("talent-icon")).not.toHaveClass("ring-live");
    expect(
      screen.getByRole("navigation", { name: "リンク" }).previousElementSibling
    ).toBeNull();
    expect(container.querySelector("p.mb-2")).toBeNull();
  });
});
