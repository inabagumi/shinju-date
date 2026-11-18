import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";

const mocks = vi.hoisted(() => ({
  addTwitchUserAction: vi.fn(),
  addYouTubeChannelAction: vi.fn(),
  removeTwitchUserAction: vi.fn(),
  removeYouTubeChannelAction: vi.fn(),
}));

vi.mock("../../_actions/channels", () => ({
  addYouTubeChannelAction: mocks.addYouTubeChannelAction,
  removeYouTubeChannelAction: mocks.removeYouTubeChannelAction,
}));

vi.mock("../../_actions/twitch-users", () => ({
  addTwitchUserAction: mocks.addTwitchUserAction,
  removeTwitchUserAction: mocks.removeTwitchUserAction,
}));

const { ChannelManager } = await import("./channel-manager");
const { TwitchUserManager } = await import("./twitch-user-manager");

interface Definition {
  name: string;
  element: ReactElement;
  addAction: ReturnType<typeof vi.fn>;
  removeAction: ReturnType<typeof vi.fn>;
  accountName: string;
  accountRowId: string;
  serviceId: string;
  url: string;
  account: string;
  addLabel: string;
  openLabel: string;
  fieldLabel: string;
  fieldName: string;
  fieldValue: string;
}

const definitions: Definition[] = [
  {
    account: "YouTubeチャンネル",
    accountName: "Main Channel",
    accountRowId: "channel-row-1",
    addAction: mocks.addYouTubeChannelAction,
    addLabel: "チャンネルを追加",
    element: (
      <ChannelManager
        accounts={[
          {
            id: "channel-row-1",
            name: "Main Channel",
            youtube_channel_id: "UC0000000000000000000001",
            youtube_handle: "@main",
          },
        ]}
        isDeleted={false}
        talentId="talent-1"
      />
    ),
    fieldLabel: "ハンドル / チャンネルID / URL",
    fieldName: "youtube_channel_id",
    fieldValue: "@example",
    name: "ChannelManager",
    openLabel: "YouTubeで開く",
    removeAction: mocks.removeYouTubeChannelAction,
    serviceId: "UC0000000000000000000001",
    url: "https://www.youtube.com/channel/UC0000000000000000000001",
  },
  {
    account: "Twitchユーザー",
    accountName: "Example User",
    accountRowId: "twitch-row-1",
    addAction: mocks.addTwitchUserAction,
    addLabel: "ユーザーを追加",
    element: (
      <TwitchUserManager
        accounts={[
          {
            id: "twitch-row-1",
            name: "Example User",
            twitch_login_name: "example",
            twitch_user_id: "123456789",
          },
        ]}
        isDeleted={false}
        talentId="talent-1"
      />
    ),
    fieldLabel: "ログイン名 / ユーザーID / URL",
    fieldName: "twitch_user",
    fieldValue: "example",
    name: "TwitchUserManager",
    openLabel: "Twitchで開く",
    removeAction: mocks.removeTwitchUserAction,
    serviceId: "123456789",
    url: "https://www.twitch.tv/example",
  },
];

describe.each(definitions)("LinkedAccountManager ($name)", (definition) => {
  const removeLabel = `${definition.account}を削除`;

  function renderManager() {
    return render(
      <ActionToastProvider>{definition.element}</ActionToastProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("links to the page on the external service", () => {
    renderManager();

    const link = screen.getByRole("link", { name: definition.openLabel });

    expect(link).toHaveAttribute("href", definition.url);
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("asks for confirmation with the account to remove", () => {
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: removeLabel }));

    const dialog = screen.getByRole("dialog");

    expect(dialog).toHaveTextContent(
      `この${definition.account}を削除してもよろしいですか？`
    );
    expect(dialog).toHaveTextContent("関連する動画データは削除されません。");
    expect(dialog).toHaveTextContent(definition.accountName);
    expect(dialog).toHaveTextContent(definition.serviceId);
  });

  it("does not remove the account when cancelled", async () => {
    renderManager();

    fireEvent.click(screen.getByRole("button", { name: removeLabel }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(definition.removeAction).not.toHaveBeenCalled();
  });

  it("removes the account and shows a toast when confirmed", async () => {
    definition.removeAction.mockResolvedValue({ success: true });

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: removeLabel }));
    fireEvent.click(screen.getByRole("button", { name: "削除" }));

    expect(
      await screen.findByText(`${definition.account}を削除しました。`)
    ).toBeInTheDocument();
    expect(definition.removeAction).toHaveBeenCalledWith(
      definition.accountRowId,
      "talent-1"
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("keeps the dialog open with the error when the removal fails", async () => {
    definition.removeAction.mockResolvedValue({
      error: "削除できませんでした。",
      success: false,
    });

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: removeLabel }));

    const dialog = screen.getByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "削除できませんでした。"
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
  });

  it("keeps the dialog open with a fallback error when the removal throws", async () => {
    definition.removeAction.mockRejectedValue(new Error("network"));

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: removeLabel }));

    const dialog = screen.getByRole("dialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "処理に失敗しました。"
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
  });

  it("adds with the dialog and closes it on success", async () => {
    definition.addAction.mockResolvedValue({ success: true });

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: definition.addLabel }));

    const dialog = screen.getByRole("dialog", {
      name: `${definition.account}を追加`,
    });

    fireEvent.change(
      within(dialog).getByRole("textbox", { name: definition.fieldLabel }),
      { target: { value: definition.fieldValue } }
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    const formData = definition.addAction.mock.calls[0]?.[1] as FormData;

    expect(formData.get("talent_id")).toBe("talent-1");
    expect(formData.get(definition.fieldName)).toBe(definition.fieldValue);
  });

  it("keeps the dialog open when adding fails", async () => {
    definition.addAction.mockResolvedValue({
      errors: { generic: [`${definition.account}の追加に失敗しました。`] },
    });

    renderManager();

    fireEvent.click(screen.getByRole("button", { name: definition.addLabel }));

    const dialog = screen.getByRole("dialog", {
      name: `${definition.account}を追加`,
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "追加" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      `${definition.account}の追加に失敗しました。`
    );
    expect(screen.getByRole("dialog")).toBe(dialog);
  });
});
