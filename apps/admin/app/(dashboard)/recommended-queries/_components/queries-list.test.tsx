import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";
import type { AppRouter } from "@/test/next-navigation";

import type { addQueryAction, deleteQueryAction } from "../_actions";

const mocks = vi.hoisted(() => ({
  addQueryAction: vi.fn<typeof addQueryAction>(),
  deleteQueryAction: vi.fn<typeof deleteQueryAction>(),
}));

vi.mock(import("next/navigation"), () => ({
  usePathname: () => "/recommended-queries",
  useRouter: () =>
    ({
      push: vi.fn<AppRouter["push"]>(),
      replace: vi.fn<AppRouter["replace"]>(),
    }) as Partial<AppRouter> as AppRouter,
  useSearchParams: () => new URLSearchParams() as ReadonlyURLSearchParams,
}));

vi.mock(import("../_actions"), () => ({
  addQueryAction: mocks.addQueryAction,
  deleteQueryAction: mocks.deleteQueryAction,
}));

const { QueriesList } = await import("./queries-list");

function renderList() {
  return render(
    <QueriesList
      autoQueries={[]}
      autoTotal={0}
      manualQueries={["ホロライブ", "歌枠"]}
      manualTotal={2}
      search={undefined}
    />,
    { wrapper: ActionToastProvider }
  );
}

describe("QueriesList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for confirmation before deleting a query", () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "「歌枠」を削除" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("おすすめクエリを削除");
    expect(dialog).toHaveTextContent("「歌枠」を削除しますか？");
    expect(mocks.deleteQueryAction).not.toHaveBeenCalled();
  });

  it("does not delete the query when cancelled", async () => {
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "「歌枠」を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.deleteQueryAction).not.toHaveBeenCalled();
  });

  it("deletes the query after confirmation", async () => {
    mocks.deleteQueryAction.mockResolvedValue({ success: true });
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "「歌枠」を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(mocks.deleteQueryAction).toHaveBeenCalledWith("歌枠");
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("クエリを削除しました。")).toBeInTheDocument();
  });

  it("keeps the dialog open and shows the error when deleting fails", async () => {
    mocks.deleteQueryAction.mockResolvedValue({
      error: "クエリの削除に失敗しました。",
      success: false,
    });
    renderList();

    fireEvent.click(screen.getByRole("button", { name: "「歌枠」を削除" }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    await expect(
      screen.findByText("クエリの削除に失敗しました。")
    ).resolves.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.queryByText("クエリを削除しました。")
    ).not.toBeInTheDocument();
  });

  it("adds a query, clears the input and shows a toast", async () => {
    mocks.addQueryAction.mockResolvedValue({ success: true });
    renderList();

    const input = screen.getByLabelText("新しい手動クエリを追加");
    fireEvent.change(input, { target: { value: "雑談" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    await expect(
      screen.findByText("クエリを追加しました。")
    ).resolves.toBeInTheDocument();
    expect(mocks.addQueryAction).toHaveBeenCalledWith("雑談");
    expect(input).toHaveValue("");
  });

  it("keeps the input and shows the error in a toast when adding fails", async () => {
    mocks.addQueryAction.mockResolvedValue({
      error: "クエリを入力してください。",
      success: false,
    });
    renderList();

    const input = screen.getByLabelText("新しい手動クエリを追加");
    fireEvent.change(input, { target: { value: "雑談" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));

    await expect(
      screen.findByText("クエリを入力してください。")
    ).resolves.toBeInTheDocument();
    expect(input).toHaveValue("雑談");
  });

  it("renders the filtered queries with the total counts", () => {
    render(
      <QueriesList
        autoQueries={[{ query: "歌枠 練習", score: 1.234 }]}
        autoTotal={5}
        manualQueries={["歌枠"]}
        manualTotal={3}
        search="歌枠"
      />,
      { wrapper: ActionToastProvider }
    );

    expect(
      screen.getByRole("heading", { name: /手動追加クエリ/ })
    ).toHaveTextContent("3件");
    expect(
      screen.getByRole("heading", { name: /自動選出クエリ/ })
    ).toHaveTextContent("5件");
    expect(screen.getByRole("cell", { name: "歌枠" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "1.23" })).toBeInTheDocument();
  });

  it.each([
    ["歌枠", "検索結果がありません。", "検索結果がありません。"],
    [
      undefined,
      "手動追加されたおすすめクエリがありません。",
      "自動選出されたおすすめクエリがありません。",
    ],
  ])(
    "tells that there is no query for the search %s",
    (search, manual, auto) => {
      render(
        <QueriesList
          autoQueries={[]}
          autoTotal={0}
          manualQueries={[]}
          manualTotal={0}
          search={search}
        />,
        { wrapper: ActionToastProvider }
      );

      expect(screen.getAllByText(manual)[0]).toBeInTheDocument();
      expect(screen.getAllByText(auto)[0]).toBeInTheDocument();
    }
  );
});
