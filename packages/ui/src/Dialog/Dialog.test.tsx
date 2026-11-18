import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";

function renderDialog() {
  return render(
    <>
      <button type="button">ダイアログの外</button>
      <Dialog>
        <DialogTrigger>削除する</DialogTrigger>
        <DialogPortal>
          <DialogOverlay data-testid="overlay" />
          <DialogContent>
            <DialogTitle>動画を削除しますか？</DialogTitle>
            <DialogDescription>
              削除した動画は元に戻せません。
            </DialogDescription>
            <DialogClose>キャンセル</DialogClose>
            <button type="button">削除</button>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}

describe("<Dialog>", () => {
  it("opens with the trigger", async () => {
    const user = userEvent.setup();

    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    const dialog = screen.getByRole("dialog");

    expect(dialog).toBeVisible();
    expect(dialog).toHaveClass(
      "rounded-container",
      "bg-surface",
      "text-foreground",
      "shadow-overlay"
    );
    expect(screen.getByTestId("overlay")).toHaveClass("fixed", "inset-0");
  });

  it("links the title and the description to the dialog", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    const dialog = screen.getByRole("dialog", { name: "動画を削除しますか？" });
    const title = screen.getByText("動画を削除しますか？");

    expect(dialog).toHaveAttribute("aria-labelledby", title.id);
    expect(dialog).toHaveAccessibleDescription(
      "削除した動画は元に戻せません。"
    );
    expect(title).toHaveClass("text-heading", "font-bold");
  });

  it("closes with the Escape key", async () => {
    const user = userEvent.setup();

    renderDialog();

    const trigger = screen.getByRole("button", { name: "削除する" });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes with the close button", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("button", { name: "削除する" }));
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the focus inside while open", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    const cancel = screen.getByRole("button", { name: "キャンセル" });
    const remove = screen.getByRole("button", { name: "削除" });

    expect(cancel).toHaveFocus();

    await user.tab();

    expect(remove).toHaveFocus();

    await user.tab();

    expect(cancel).toHaveFocus();

    await user.tab({ shift: true });

    expect(remove).toHaveFocus();
  });

  // ダイアログの外の要素は支援技術から隠れ、フォーカスを移しても中へ戻る
  it("hides the outside from assistive technology and keeps the focus inside while open", async () => {
    const user = userEvent.setup();

    renderDialog();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(
      screen.queryByRole("button", { name: "ダイアログの外" })
    ).not.toBeInTheDocument();

    const outside = screen.getByText("ダイアログの外");

    act(() => {
      outside.focus();
    });

    expect(outside).not.toHaveFocus();
    expect(screen.getByRole("dialog")).toContainElement(
      document.activeElement as HTMLElement
    );
  });
});
