import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TalentStreamStatus } from "@/lib/data/talents";
import { createTalentListItem } from "@/test/factories";

import TalentCard from "./talent-card";
import TalentGrid from "./talent-grid";

vi.mock(import("@/lib/data/talents"), () => ({}));

const TALENT_ID = "00000000-0000-4000-8000-000000000001";

const TALENT = createTalentListItem({
  id: TALENT_ID,
  name: "朝霧ミオ",
  youtube_channels: [{ profile_image: { blur_data_url: "", id: "icon-1" } }],
});

describe(TalentCard, () => {
  it("should link to the page of the talent by its name", () => {
    render(<TalentCard talent={TALENT} />);

    expect(screen.getByRole("link", { name: "朝霧ミオ" })).toHaveAttribute(
      "href",
      `/talents/${TALENT_ID}`
    );
  });

  it("should show the icon as a decoration", () => {
    const { container } = render(<TalentCard talent={TALENT} />);

    expect(screen.getByTestId("talent-icon")).toHaveClass(
      "size-20",
      "sm:size-24",
      "lg:size-28"
    );
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(container.querySelector("img")?.getAttribute("src")).toContain(
      "profile-images%2Ficon-1"
    );
  });

  it("should show the default icon for a talent without icons", () => {
    render(
      <TalentCard
        talent={createTalentListItem({ ...TALENT, youtube_channels: [] })}
      />
    );

    expect(screen.getByTestId("talent-default-icon")).toBeInTheDocument();
  });

  it("should wrap a long name", () => {
    render(
      <TalentCard
        talent={createTalentListItem({
          ...TALENT,
          name: "AVeryLongTalentNameWithoutSpaces",
        })}
      />
    );

    expect(screen.getByText("AVeryLongTalentNameWithoutSpaces")).toHaveClass(
      "wrap-anywhere"
    );
  });
});

describe("TalentCard with the stream status", () => {
  const live: TalentStreamStatus = { isLive: true, nextStreamAt: null };
  // 2026-11-16 20:00 in Japan
  const upcoming: TalentStreamStatus = {
    isLive: false,
    nextStreamAt: "2026-11-16T11:00:00Z",
  };

  it("should show neither the badge nor the next stream by default", () => {
    render(<TalentCard talent={TALENT} />);

    const link = screen.getByRole("link", { name: "朝霧ミオ" });

    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("配信中")).not.toBeInTheDocument();
    expect(screen.queryByText(/次回/u)).not.toBeInTheDocument();
    expect(screen.getByTestId("talent-icon")).not.toHaveClass("ring-live");
  });

  it("should show the ring and the badge while live", () => {
    render(<TalentCard streamStatus={live} talent={TALENT} />);

    const link = screen.getByRole("link", { name: "朝霧ミオ" });

    expect(link).toHaveAccessibleDescription("配信中");
    expect(screen.getByText("配信中")).toHaveClass(
      "bg-live",
      "text-live-foreground",
      "text-caption",
      "font-semibold",
      "rounded-control"
    );
    expect(screen.getByTestId("talent-icon")).toHaveClass(
      "ring-2",
      "ring-live",
      "ring-offset-2",
      "ring-offset-background"
    );
  });

  it("should show the ring around the default icon too", () => {
    render(
      <TalentCard
        streamStatus={live}
        talent={createTalentListItem({ ...TALENT, youtube_channels: [] })}
      />
    );

    expect(screen.getByTestId("talent-default-icon")).toHaveClass("ring-live");
  });

  it("should show the start of the next stream in Japan time", () => {
    render(<TalentCard streamStatus={upcoming} talent={TALENT} />);

    const link = screen.getByRole("link", { name: "朝霧ミオ" });
    const nextStream = screen.getByText(/^次回/u);

    expect(link).toHaveAccessibleDescription("次回 11/16 20:00");
    expect(nextStream).toHaveTextContent("次回 11/16 20:00");
    expect(nextStream).toHaveClass(
      "text-caption",
      "text-muted",
      "tabular-nums"
    );
    expect(nextStream.querySelector("time")).toHaveAttribute(
      "dateTime",
      "2026-11-16T20:00:00+09:00"
    );
  });

  it("should not show the live status before the next stream", () => {
    render(<TalentCard streamStatus={upcoming} talent={TALENT} />);

    expect(screen.queryByText("配信中")).not.toBeInTheDocument();
    expect(screen.getByTestId("talent-icon")).not.toHaveClass("ring-live");
  });

  it("should not show the next stream while live", () => {
    render(
      <TalentCard
        streamStatus={{ isLive: true, nextStreamAt: "2026-11-16T11:00:00Z" }}
        talent={TALENT}
      />
    );

    expect(screen.getByText("配信中")).toBeInTheDocument();
    expect(screen.queryByText(/次回/u)).not.toBeInTheDocument();
  });
});

describe(TalentGrid, () => {
  it("should list the talents in order", () => {
    render(
      <TalentGrid
        talents={[
          TALENT,
          createTalentListItem({
            ...TALENT,
            id: "00000000-0000-4000-8000-000000000002",
            name: "夜宵ルナ",
          }),
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.textContent)).toStrictEqual([
      "朝霧ミオ",
      "夜宵ルナ",
    ]);
  });

  it("should keep the order of the talents while some are live", () => {
    const secondId = "00000000-0000-4000-8000-000000000002";

    render(
      <TalentGrid
        streamStatuses={{
          [secondId]: { isLive: true, nextStreamAt: null },
        }}
        talents={[
          TALENT,
          createTalentListItem({ ...TALENT, id: secondId, name: "夜宵ルナ" }),
        ]}
      />
    );

    const links = screen.getAllByRole("link");

    expect(links.map((link) => link.getAttribute("href"))).toStrictEqual([
      `/talents/${TALENT_ID}`,
      `/talents/${secondId}`,
    ]);
    expect(links[0]).not.toHaveAttribute("aria-describedby");
    expect(links[1]).toHaveAccessibleDescription("配信中");
  });

  it("should show the empty state without any talent", () => {
    render(<TalentGrid talents={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(
      screen.getByText("表示できるタレントがいません")
    ).toBeInTheDocument();
  });
});
