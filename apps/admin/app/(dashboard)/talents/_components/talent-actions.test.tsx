import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";

const mocks = vi.hoisted(() => ({
  activateTalentAction: vi.fn(),
  deleteTalentAction: vi.fn(),
  refresh: vi.fn(),
  restoreTalentAction: vi.fn(),
  retireTalentAction: vi.fn(),
  syncTalentAccountsAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("../_actions", () => ({
  activateTalentAction: mocks.activateTalentAction,
  deleteTalentAction: mocks.deleteTalentAction,
  restoreTalentAction: mocks.restoreTalentAction,
  retireTalentAction: mocks.retireTalentAction,
}));

vi.mock("../_actions/sync", () => ({
  syncTalentAccountsAction: mocks.syncTalentAccountsAction,
}));

const { TalentActions } = await import("./talent-actions");

type TalentActionsTalent = Parameters<typeof TalentActions>[0]["talent"];

const activeTalent: TalentActionsTalent = {
  deleted_at: null,
  id: "talent-1",
  name: "テストタレント",
  status: "active",
};

function renderActions(talent: TalentActionsTalent = activeTalent) {
  return render(
    <ActionToastProvider>
      <TalentActions talent={talent} />
    </ActionToastProvider>
  );
}

// メニューはポインターを押したときかキーで開くため、Enter で開く
function openMenuItem(name: string) {
  fireEvent.keyDown(
    screen.getByRole("button", { name: "「テストタレント」の操作" }),
    { key: "Enter" }
  );
  fireEvent.click(screen.getByRole("menuitem", { name }));
}

describe("TalentActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens the confirmation dialog from the menu without running the action", () => {
    renderActions();

    openMenuItem("削除");

    expect(
      screen.getByRole("dialog", { name: "タレントを削除" })
    ).toHaveTextContent("タレント「テストタレント」を削除しますか？");
    expect(mocks.deleteTalentAction).not.toHaveBeenCalled();
  });

  it("does not run the action when cancelled", async () => {
    renderActions();

    openMenuItem("引退にする");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.retireTalentAction).not.toHaveBeenCalled();
  });

  it("runs the action and shows a toast on success", async () => {
    mocks.restoreTalentAction.mockResolvedValue({ success: true });
    renderActions({
      ...activeTalent,
      deleted_at: "2026-01-01T00:00:00.000Z",
    });

    openMenuItem("復活");
    fireEvent.click(screen.getByRole("button", { name: "復活" }));

    await expect(
      screen.findByText("タレントを復活しました。")
    ).resolves.toBeInTheDocument();
    expect(mocks.restoreTalentAction).toHaveBeenCalledWith("talent-1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("offers to make a retired talent active again", async () => {
    mocks.activateTalentAction.mockResolvedValue({ success: true });
    renderActions({ ...activeTalent, status: "retired" });

    openMenuItem("アクティブに戻す");
    fireEvent.click(screen.getByRole("button", { name: "アクティブに戻す" }));

    await expect(
      screen.findByText("タレントをアクティブに戻しました。")
    ).resolves.toBeInTheDocument();
    expect(mocks.activateTalentAction).toHaveBeenCalledWith("talent-1");
  });

  it("shows the platforms that failed to sync as warnings", async () => {
    mocks.syncTalentAccountsAction.mockResolvedValue({
      data: {
        message: "Twitch: ユーザー情報を同期しました。",
        unchanged: false,
      },
      success: true,
      warnings: ["YouTube: 同期に失敗しました。"],
    });
    renderActions();

    openMenuItem("同期");

    await expect(
      screen.findByText("Twitch: ユーザー情報を同期しました。")
    ).resolves.toBeInTheDocument();
    expect(
      screen.getByText("YouTube: 同期に失敗しました。")
    ).toBeInTheDocument();
    expect(mocks.syncTalentAccountsAction).toHaveBeenCalledWith("talent-1");
  });
});
