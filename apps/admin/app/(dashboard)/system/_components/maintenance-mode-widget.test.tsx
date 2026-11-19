import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/action";

import type {
  disableMaintenanceModeAction,
  enableMaintenanceModeAction,
} from "../_actions/maintenance-mode";

const mocks = vi.hoisted(() => ({
  disableMaintenanceModeAction: vi.fn<typeof disableMaintenanceModeAction>(),
  enableMaintenanceModeAction: vi.fn<typeof enableMaintenanceModeAction>(),
}));

vi.mock(import("../_actions/maintenance-mode"), () => ({
  disableMaintenanceModeAction: mocks.disableMaintenanceModeAction,
  enableMaintenanceModeAction: mocks.enableMaintenanceModeAction,
}));

const { MaintenanceModeWidget } = await import("./maintenance-mode-widget");

const toggle = () => {
  fireEvent.click(
    screen.getByRole("switch", { name: "メンテナンスモード切り替え" })
  );
};

describe("MaintenanceModeWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for confirmation before enabling", () => {
    render(<MaintenanceModeWidget initialStatus={false} />);

    toggle();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("メンテナンスモードを有効にしますか？");
    expect(mocks.enableMaintenanceModeAction).not.toHaveBeenCalled();
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("enables maintenance mode after confirmation", async () => {
    mocks.enableMaintenanceModeAction.mockResolvedValue({ success: true });
    render(<MaintenanceModeWidget initialStatus={false} />);

    toggle();
    fireEvent.click(screen.getByRole("button", { name: "有効にする" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.enableMaintenanceModeAction).toHaveBeenCalledOnce();
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("disables maintenance mode after confirmation", async () => {
    mocks.disableMaintenanceModeAction.mockResolvedValue({ success: true });
    render(<MaintenanceModeWidget initialStatus={true} />);

    toggle();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "メンテナンスモードを無効にしますか？"
    );
    fireEvent.click(screen.getByRole("button", { name: "無効にする" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.disableMaintenanceModeAction).toHaveBeenCalledOnce();
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("keeps the current state when cancelled", async () => {
    render(<MaintenanceModeWidget initialStatus={false} />);

    toggle();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(mocks.enableMaintenanceModeAction).not.toHaveBeenCalled();
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });

  it("shows the error in the dialog when the action fails", async () => {
    // Not in the type of the result, but handled in case it has no error
    mocks.enableMaintenanceModeAction.mockResolvedValue({
      success: false,
    } as ActionResult);
    render(<MaintenanceModeWidget initialStatus={false} />);

    toggle();
    fireEvent.click(screen.getByRole("button", { name: "有効にする" }));

    await expect(
      screen.findByText("メンテナンスモードの有効化に失敗しました。")
    ).resolves.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("OFF")).toBeInTheDocument();
  });
});
