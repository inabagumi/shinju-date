import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppRouter } from "@/test/next-navigation";

import type {
  createTermAction,
  deleteTermAction,
  updateTermAction,
} from "../_actions";
import { groupTermsByInitial } from "../_lib/group-terms";

const mocks = vi.hoisted(() => ({
  deleteTermAction: vi.fn<typeof deleteTermAction>(),
}));

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/terms",
  useRouter: () =>
    ({
      push: vi.fn<AppRouter["push"]>(),
      replace: vi.fn<AppRouter["replace"]>(),
    }) as Partial<AppRouter> as AppRouter,
  useSearchParams: () => new URLSearchParams() as ReadonlyURLSearchParams,
}));

vi.mock(import("../_actions"), () => ({
  createTermAction: vi.fn<typeof createTermAction>(),
  deleteTermAction: mocks.deleteTermAction,
  updateTermAction: vi.fn<typeof updateTermAction>(),
}));

const { TermsList } = await import("./terms-list");

const TERMS = [
  {
    id: "term-1",
    readings: ["ウタワク"],
    synonyms: ["歌配信", "カラオケ配信"],
    term: "歌枠",
  },
  { id: "term-2", readings: [], synonyms: [], term: "ASMR" },
];

describe("TermsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the terms grouped by the initial with an index", () => {
    render(
      <TermsList groups={groupTermsByInitial(TERMS)} search={undefined} />
    );

    const index = screen.getByRole("navigation", { name: "頭文字の索引" });
    expect(
      within(index)
        .getAllByRole("link")
        .map((link) => [link.textContent, link.getAttribute("href")])
    ).toStrictEqual([
      ["A", "#group-A"],
      ["ア", "#group-ア"],
    ]);

    const groupHeader = screen.getByRole("columnheader", { name: /^ア/ });
    expect(groupHeader).toHaveTextContent("ア1件");
    expect(groupHeader.closest("tr")).toHaveAttribute("id", "group-ア");
  });

  it("renders the reading and the synonyms of each term", () => {
    render(
      <TermsList groups={groupTermsByInitial(TERMS)} search={undefined} />
    );

    const row = screen
      .getAllByRole("row")
      .find((element) => element.textContent?.includes("歌枠"));
    expect(row).toBeDefined();
    const cells = within(row as HTMLElement).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("ウタワク");
    expect(cells[2]).toHaveTextContent("歌配信、カラオケ配信");

    const asmrRow = screen
      .getAllByRole("row")
      .find((element) => element.textContent?.startsWith("ASMR"));
    expect(
      within(asmrRow as HTMLElement).getAllByRole("cell")[1]
    ).toHaveTextContent("—");
  });

  it("hides the index while searching", () => {
    render(<TermsList groups={groupTermsByInitial(TERMS)} search="うた" />);

    expect(
      screen.queryByRole("navigation", { name: "頭文字の索引" })
    ).not.toBeInTheDocument();
  });

  it.each([
    ["うた", "検索結果がありません。"],
    [undefined, "用語がありません。"],
  ])("tells that there is no term for the search %s", (search, message) => {
    render(<TermsList groups={[]} search={search} />);

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("opens the edit modal of a term", () => {
    render(
      <TermsList groups={groupTermsByInitial(TERMS)} search={undefined} />
    );

    const row = screen
      .getAllByRole("row")
      .find((element) => element.textContent?.includes("歌枠")) as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "編集" }));

    expect(
      screen.getByRole("dialog", { name: "用語を編集" })
    ).toBeInTheDocument();
  });

  it("deletes a term after confirmation", async () => {
    mocks.deleteTermAction.mockResolvedValue({ success: true });
    render(
      <TermsList groups={groupTermsByInitial(TERMS)} search={undefined} />
    );

    const row = screen
      .getAllByRole("row")
      .find((element) => element.textContent?.includes("歌枠")) as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "削除" }));

    const dialog = screen.getByRole("dialog", { name: "用語を削除" });
    expect(dialog).toHaveTextContent(
      "本当に「歌枠」を削除しますか？この操作は取り消せません。"
    );
    expect(mocks.deleteTermAction).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(mocks.deleteTermAction).toHaveBeenCalledWith("term-1");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
