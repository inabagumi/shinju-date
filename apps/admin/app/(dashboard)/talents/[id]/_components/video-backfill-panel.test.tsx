import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";

import type { VideoBackfillAccount } from "../../_lib/get-video-backfill-status";

const mocks = vi.hoisted(() => ({
  getVideoBackfillStatusAction: vi.fn(),
  requestVideoBackfillAction: vi.fn(),
  // The same instance on every render, like the router of Next.js.
  router: { refresh: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));
vi.mock("../../_actions/backfill", () => ({
  getVideoBackfillStatusAction: mocks.getVideoBackfillStatusAction,
  requestVideoBackfillAction: mocks.requestVideoBackfillAction,
}));

const { VideoBackfillPanel } = await import("./video-backfill-panel");

function createAccount(
  overrides: Partial<VideoBackfillAccount> = {}
): VideoBackfillAccount {
  return {
    accountId: "channel-row-1",
    active: false,
    added: 0,
    error: null,
    finishedAt: null,
    name: "Main",
    pages: 0,
    provider: "youtube",
    requestedAt: null,
    status: null,
    updatedAt: null,
    ...overrides,
  };
}

function renderPanel(accounts: VideoBackfillAccount[]) {
  return render(
    <VideoBackfillPanel
      initialData={{ accounts, success: true }}
      talentId="talent-1"
      talentName="Talent"
    />,
    { wrapper: ActionToastProvider }
  );
}

describe("VideoBackfillPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the progress it was given without fetching it", () => {
    renderPanel([
      createAccount({ added: 12, pages: 3, status: "done" }),
      createAccount({
        accountId: "twitch-row-1",
        name: "alice",
        provider: "twitch",
      }),
    ]);

    expect(screen.getByText("12件追加 · 3ページ確認")).toBeTruthy();
    expect(screen.getByText("完了")).toBeTruthy();
    // An account that was never backfilled has no progress to show.
    expect(screen.getByText("未実行")).toBeTruthy();
    expect(mocks.getVideoBackfillStatusAction).not.toHaveBeenCalled();
  });

  it("offers only the platforms the talent has an account on", () => {
    renderPanel([createAccount()]);

    expect(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Twitchの過去動画を取り込む" })
    ).toBeNull();
  });

  it("shows the accounts the server sends after one was added", () => {
    const { rerender } = renderPanel([createAccount()]);

    rerender(
      <VideoBackfillPanel
        initialData={{
          accounts: [
            createAccount(),
            createAccount({
              accountId: "twitch-row-1",
              name: "alice",
              provider: "twitch",
            }),
          ],
          success: true,
        }}
        talentId="talent-1"
        talentName="Talent"
      />
    );

    expect(screen.getByText("alice")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Twitchの過去動画を取り込む" })
    ).toHaveProperty("disabled", false);
    expect(mocks.getVideoBackfillStatusAction).not.toHaveBeenCalled();
  });

  it("renders nothing for a talent without accounts", () => {
    const { container } = renderPanel([]);

    expect(container.textContent).toBe("");
  });

  it("can still be requested while only some accounts are active", () => {
    renderPanel([
      createAccount({ active: true, status: "running" }),
      createAccount({ accountId: "channel-row-2", name: "Sub" }),
    ]);

    expect(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    ).toHaveProperty("disabled", false);
  });

  it("cannot be requested while every account is active", () => {
    renderPanel([createAccount({ active: true, status: "pending" })]);

    expect(
      screen.getByRole("button", { name: "YouTube: 実行中" })
    ).toHaveProperty("disabled", true);
  });

  it("asks for confirmation with the talent and the accounts", () => {
    renderPanel([
      createAccount(),
      createAccount({ accountId: "channel-row-2", name: "Sub" }),
      createAccount({
        accountId: "twitch-row-1",
        name: "alice",
        provider: "twitch",
      }),
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    );

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent(
      "「Talent」のYouTubeアカウント（2件）の過去動画をすべて確認し、未登録の動画を取り込みますか？"
    );
    expect(dialog).toHaveTextContent(
      "処理はバックグラウンドで順番に行われます。"
    );
    expect(within(dialog).getByText("Main")).toBeTruthy();
    expect(within(dialog).getByText("Sub")).toBeTruthy();
    expect(within(dialog).queryByText("alice")).toBeNull();
  });

  it("does not request the backfill when cancelled", async () => {
    renderPanel([createAccount()]);

    fireEvent.click(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    );
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.requestVideoBackfillAction).not.toHaveBeenCalled();
  });

  it("requests the backfill when confirmed", async () => {
    mocks.requestVideoBackfillAction.mockResolvedValue({
      data: { message: "キューに追加しました。" },
      success: true,
    });
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      data: {
        accounts: [createAccount({ active: true, status: "pending" })],
        success: true,
      },
      success: true,
    });

    renderPanel([createAccount()]);

    fireEvent.click(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    );
    fireEvent.click(screen.getByRole("button", { name: "取り込む" }));

    await expect(
      screen.findByText("キューに追加しました。")
    ).resolves.toBeTruthy();
    expect(mocks.requestVideoBackfillAction).toHaveBeenCalledWith(
      "talent-1",
      "youtube"
    );

    // The job that was just queued shows up without reloading the page.
    await expect(
      screen.findByRole("button", { name: "YouTube: 実行中" })
    ).resolves.toBeTruthy();
    expect(mocks.getVideoBackfillStatusAction).toHaveBeenCalledWith("talent-1");
  });

  it("refreshes the page when the backfill added videos", async () => {
    mocks.requestVideoBackfillAction.mockResolvedValue({ success: true });
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      data: {
        accounts: [createAccount({ added: 15, status: "done" })],
        success: true,
      },
      success: true,
    });

    renderPanel([createAccount({ added: 12, status: "done" })]);

    expect(mocks.router.refresh).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "YouTubeの過去動画を取り込む" })
    );
    fireEvent.click(screen.getByRole("button", { name: "取り込む" }));

    // The videos that were just added show up in the list below the panel.
    await waitFor(() => expect(mocks.router.refresh).toHaveBeenCalledOnce());
  });

  it("does not refresh the page for progress that the server sent", () => {
    const { rerender } = renderPanel([
      createAccount({ active: true, added: 12, status: "running" }),
    ]);

    rerender(
      <VideoBackfillPanel
        initialData={{
          accounts: [
            createAccount({ active: true, added: 15, status: "running" }),
          ],
          success: true,
        }}
        talentId="talent-1"
        talentName="Talent"
      />
    );

    // The server rendered the list of videos together with this progress.
    expect(screen.getByText(/15件追加/)).toBeTruthy();
    expect(mocks.router.refresh).not.toHaveBeenCalled();
  });
});
