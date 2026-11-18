import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";

import type { TalentListItem } from "../_lib/get-talents";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/talents",
  useRouter: () => ({
    push: mocks.push,
    refresh: vi.fn(),
    replace: mocks.replace,
  }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("../_actions", () => ({
  activateTalentAction: vi.fn(),
  createTalentAction: vi.fn(),
  deleteTalentAction: vi.fn(),
  restoreTalentAction: vi.fn(),
  retireTalentAction: vi.fn(),
}));

vi.mock("../_actions/sync", () => ({
  syncTalentAccountsAction: vi.fn(),
}));

const { TalentsList } = await import("./talents-list");

type TalentsListProps = Parameters<typeof TalentsList>[0];

function createTalent(overrides: Partial<TalentListItem> = {}): TalentListItem {
  return {
    created_at: "2025-01-01T00:00:00Z",
    deleted_at: null,
    id: "00000000-0000-4000-8000-000000000001",
    name: "テストタレント",
    status: "active",
    updated_at: "2025-01-02T00:00:00Z",
    youtube_channels: [],
    ...overrides,
  };
}

function renderList(props: Partial<TalentsListProps> = {}) {
  return render(
    <TalentsList
      search={undefined}
      searchParams=""
      sortOrder="desc"
      statusFilter="not_deleted"
      talents={[createTalent()]}
      {...props}
    />,
    { wrapper: ActionToastProvider }
  );
}

describe("TalentsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
  });

  it("renders a row for each talent with a link, the status and the actions", () => {
    renderList({
      talents: [
        createTalent({
          youtube_channels: [
            {
              id: "channel-1",
              name: "YouTube のチャンネル",
              youtube_channel_id: "UC0000000000000000000000",
              youtube_handle: null,
            },
          ],
        }),
        createTalent({
          deleted_at: "2025-01-03T00:00:00Z",
          id: "00000000-0000-4000-8000-000000000002",
          name: "削除したタレント",
        }),
      ],
    });

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);

    const [first, second] = rows as [HTMLElement, HTMLElement];
    expect(
      within(first).getByRole("link", { name: "テストタレント" })
    ).toHaveAttribute("href", "/talents/00000000-0000-4000-8000-000000000001");
    expect(first).toHaveTextContent("YouTube: YouTube のチャンネル");
    expect(first).toHaveTextContent("UC0000000000000000000000");
    expect(first).toHaveTextContent("アクティブ");
    expect(
      within(first).getByRole("button", { name: "「テストタレント」の操作" })
    ).toBeInTheDocument();

    // チャンネルがないときは、ID を出す
    expect(second).toHaveTextContent("00000000-0000-4000-8000-000000000002");
    expect(second).toHaveTextContent("削除済み");
  });

  it("links the sort header to the opposite order and keeps the filters", () => {
    const { rerender } = renderList({ searchParams: "search=abc&status=all" });

    const header = screen.getByRole("columnheader", { name: /最終更新日時/ });
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(within(header).getByRole("link")).toHaveAttribute(
      "href",
      "/talents?search=abc&status=all&sort=asc"
    );

    // 既定の向き（降順）に戻すときは、パラメータを消す
    rerender(
      <TalentsList
        search="abc"
        searchParams="search=abc&status=all&sort=asc"
        sortOrder="asc"
        statusFilter="all"
        talents={[createTalent()]}
      />
    );

    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(within(header).getByRole("link")).toHaveAttribute(
      "href",
      "/talents?search=abc&status=all"
    );
  });

  it("writes the selected status to the URL and removes it for the default", () => {
    mocks.searchParams = new URLSearchParams("search=abc");
    renderList();

    const select = screen.getByRole("combobox", { name: "状態で絞り込み" });
    expect(select).toHaveValue("not_deleted");

    fireEvent.change(select, { target: { value: "retired" } });
    expect(mocks.replace).toHaveBeenLastCalledWith(
      "/talents?search=abc&status=retired"
    );

    mocks.searchParams = new URLSearchParams("search=abc&status=retired");
    fireEvent.change(select, { target: { value: "not_deleted" } });
    expect(mocks.replace).toHaveBeenLastCalledWith("/talents?search=abc");
  });

  it("shows the current status filter", () => {
    renderList({ statusFilter: "deleted" });

    expect(
      screen.getByRole("combobox", { name: "状態で絞り込み" })
    ).toHaveValue("deleted");
  });

  it("tells that no talent matches when filtered", () => {
    renderList({ search: "none", talents: [] });

    expect(screen.getByText("検索結果がありません。")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("tells that there are no talents when not filtered", () => {
    renderList({ talents: [] });

    expect(screen.getByText("タレントがいません。")).toBeInTheDocument();
  });
});
