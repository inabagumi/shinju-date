import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const fetchers = vi.hoisted(() => ({
  fetchTalentList: vi.fn(),
  fetchTalentStreamStatusesSafe: vi.fn(),
}));

vi.mock("@/lib/data/talents", () => fetchers);

import { TalentListGrid } from "./talent-list-sections";

const TALENT_ID = "00000000-0000-4000-8000-000000000001";

describe("TalentListGrid", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchers.fetchTalentList.mockResolvedValue([
      {
        id: TALENT_ID,
        name: "朝霧ミオ",
        twitch_users: [],
        youtube_channels: [],
      },
    ]);
  });

  test("should show the talents with their stream statuses", async () => {
    fetchers.fetchTalentStreamStatusesSafe.mockResolvedValue({
      [TALENT_ID]: { isLive: true, nextStreamAt: null },
    });

    render(await TalentListGrid());

    expect(
      screen.getByRole("link", { name: "朝霧ミオ" })
    ).toHaveAccessibleDescription("配信中");
  });

  test("should still show the talents without the stream statuses", async () => {
    fetchers.fetchTalentStreamStatusesSafe.mockResolvedValue({});

    render(await TalentListGrid());

    const link = screen.getByRole("link", { name: "朝霧ミオ" });

    expect(link).not.toHaveAttribute("aria-describedby");
    expect(screen.getByTestId("talent-default-icon")).toBeInTheDocument();
    expect(screen.queryByText("配信中")).not.toBeInTheDocument();
  });
});
