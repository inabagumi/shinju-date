import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActionToastProvider } from "@/components/action-toast";

import {
  SERVER_ACTION_FALLBACK_ERROR,
  useServerAction,
} from "./use-server-action";
import type {
  ServerActionResult,
  UseServerActionOptions,
} from "./use-server-action";

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) => (
  <ActionToastProvider>{children}</ActionToastProvider>
);

const renderServerAction = <
  TArgs extends unknown[],
  TResult extends ServerActionResult,
>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: UseServerActionOptions<TResult>
) =>
  renderHook(() => useServerAction(action, options), {
    wrapper: Wrapper,
  });

/** トーストは、`ToastViewport`（`role="region"`）の中のリストの項目として描かれる */
const getToasts = () =>
  within(screen.getByRole("region")).queryAllByRole("listitem");

const ComponentOutsideProvider = () => {
  useServerAction(() => Promise.resolve({ success: true }));
  return null;
};

describe(useServerAction, () => {
  it("passes the arguments to the action and shows the success text", async () => {
    const action = vi
      .fn<(id: string, value: number) => Promise<ServerActionResult>>()
      .mockResolvedValue({
        success: true,
      });
    const onSuccess = vi.fn<(result: ServerActionResult) => void>();
    const { result } = renderServerAction(action, {
      onSuccess,
      successText: "表示状態を更新しました。",
    });

    let returned: ServerActionResult | undefined;
    await act(async () => {
      returned = await result.current.run("video-1", 2);
    });

    expect(action).toHaveBeenCalledWith("video-1", 2);
    expect(returned).toStrictEqual({ success: true });
    expect(onSuccess).toHaveBeenCalledWith({ success: true });
    await expect(
      screen.findByText("表示状態を更新しました。")
    ).resolves.toBeInTheDocument();
  });

  it("builds the success text from the result", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult & { message: string }>>()
      .mockResolvedValue({
        message: "チャンネル情報は既に最新です。",
        success: true,
      });
    const { result } = renderServerAction(action, {
      successText: (actionResult) => actionResult.message,
    });

    await act(async () => {
      await result.current.run();
    });

    await expect(
      screen.findByText("チャンネル情報は既に最新です。")
    ).resolves.toBeInTheDocument();
  });

  it("shows no toast on success without successText", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult>>()
      .mockResolvedValue({
        success: true,
      });
    const { result } = renderServerAction(action);

    await act(async () => {
      await result.current.run();
    });

    expect(action).toHaveBeenCalledOnce();
    expect(getToasts()).toHaveLength(0);
  });

  it("shows the returned error on failure without calling onSuccess", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult>>()
      .mockResolvedValue({
        error: "指定されたタレントが見つかりません。",
        success: false,
      });
    const onSuccess = vi.fn<(result: ServerActionResult) => void>();
    const { result } = renderServerAction(action, {
      onSuccess,
      successText: "削除しました。",
    });

    await act(async () => {
      await result.current.run();
    });

    await expect(
      screen.findByText("指定されたタレントが見つかりません。")
    ).resolves.toBeInTheDocument();
    expect(screen.queryByText("削除しました。")).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("shows errorText when the failure has no error", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult>>()
      .mockResolvedValue({
        success: false,
      });
    const { result } = renderServerAction(action, {
      errorText: "同期に失敗しました。",
    });

    await act(async () => {
      await result.current.run();
    });

    await expect(
      screen.findByText("同期に失敗しました。")
    ).resolves.toBeInTheDocument();
  });

  it("shows a warning toast for each warning", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult>>()
      .mockResolvedValue({
        success: true,
        warnings: [
          "1件は更新できませんでした。",
          "監査ログを残せませんでした。",
        ],
      });
    const { result } = renderServerAction(action, {
      successText: "更新しました。",
    });

    await act(async () => {
      await result.current.run();
    });

    await expect(
      screen.findByText("更新しました。")
    ).resolves.toBeInTheDocument();
    expect(screen.getByText("1件は更新できませんでした。")).toBeInTheDocument();
    expect(
      screen.getByText("監査ログを残せませんでした。")
    ).toBeInTheDocument();
    expect(getToasts()).toHaveLength(3);
  });

  it("shows the fallback error when the action throws", async () => {
    const action = vi
      .fn<() => Promise<ServerActionResult>>()
      .mockRejectedValue(new Error("connection reset"));
    const onSuccess = vi.fn<(result: ServerActionResult) => void>();
    const { result } = renderServerAction<[], ServerActionResult>(action, {
      onSuccess,
      successText: "更新しました。",
    });

    let returned: ServerActionResult | undefined = { success: true };
    await act(async () => {
      returned = await result.current.run();
    });

    expect(returned).toBeUndefined();
    await expect(
      screen.findByText(SERVER_ACTION_FALLBACK_ERROR)
    ).resolves.toBeInTheDocument();
    expect(screen.queryByText("connection reset")).not.toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("is pending while the action runs", async () => {
    const deferred = Promise.withResolvers<ServerActionResult>();
    const action = vi.fn<() => Promise<ServerActionResult>>(
      () => deferred.promise
    );
    const { result } = renderServerAction(action);

    expect(result.current.isPending).toBeFalsy();

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.run();
    });

    await waitFor(() => {
      expect(result.current.isPending).toBeTruthy();
    });

    await act(async () => {
      deferred.resolve({ success: true });
      await pending;
    });

    expect(result.current.isPending).toBeFalsy();
  });

  it("throws when used outside ActionToastProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ComponentOutsideProvider />)).toThrow(
      "useActionToast must be used within an ActionToastProvider."
    );
  });
});
