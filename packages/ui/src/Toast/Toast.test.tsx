import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  Toast,
  ToastClose,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./Toast";
import type { ToastProps } from "./Toast";

function renderToast(props: Omit<ToastProps, "children"> = {}) {
  return render(
    <ToastProvider>
      <Toast {...props}>
        <ToastTitle>設定を保存しました。</ToastTitle>
        <ToastClose aria-label="閉じる" />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

/** トーストは、`ToastViewport`（`role="region"`）の中のリストの項目として描かれる */
function getToasts() {
  return within(screen.getByRole("region")).queryAllByRole("listitem");
}

describe("Toast", () => {
  // jsdom には `hasPointerCapture` がない。トーストは、スワイプの処理のために `pointerup` で呼ぶ
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false,
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLElement.prototype, "hasPointerCapture");
  });

  it("shows the toast in the viewport", () => {
    renderToast();

    const [toast] = getToasts();

    expect(getToasts()).toHaveLength(1);
    expect(toast).toHaveTextContent("設定を保存しました。");
    expect(
      within(screen.getByRole("list")).getByText("設定を保存しました。")
    ).toHaveClass("font-semibold");
    expect(screen.getByRole("list")).toHaveClass("fixed", "bottom-0", "z-100");
  });

  it("announces the toast in a live region", async () => {
    renderToast();

    const status = await screen.findByRole("status");

    expect(status).toHaveAttribute("aria-live", "assertive");
    await waitFor(() => {
      expect(status).toHaveTextContent("設定を保存しました。");
    });
  });

  it("announces a background toast politely", async () => {
    renderToast({ type: "background" });

    await expect(screen.findByRole("status")).resolves.toHaveAttribute(
      "aria-live",
      "polite"
    );
  });

  it("disappears with the close button", async () => {
    const user = userEvent.setup();

    renderToast();

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(getToasts()).toHaveLength(0);
    expect(screen.queryByText("設定を保存しました。")).not.toBeInTheDocument();
  });

  it.each<[NonNullable<ToastProps["variant"]>, string[]]>([
    ["default", ["border-border", "bg-surface", "text-foreground"]],
    ["success", ["border-success", "bg-surface", "text-success"]],
    ["warning", ["border-warning", "bg-surface", "text-warning"]],
    ["danger", ["border-danger", "bg-surface", "text-danger"]],
  ])("uses the classes of the %s variant", (variant, classes) => {
    renderToast({ variant });

    const [toast] = getToasts();

    expect(toast).toHaveClass(
      "rounded-container",
      "border",
      "shadow-overlay",
      ...classes
    );
  });
});
