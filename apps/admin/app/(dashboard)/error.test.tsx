import type { captureException } from "@sentry/nextjs";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DashboardError from "./error";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn<typeof captureException>(),
}));

vi.mock(import("@sentry/nextjs"), () => ({
  captureException: mocks.captureException,
}));

describe(DashboardError, () => {
  it("shows the error and a link back to the dashboard", () => {
    render(
      <DashboardError error={new Error("failed")} retry={vi.fn<() => void>()} />
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "ページを表示できませんでした",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "ダッシュボードに戻る" })
    ).toHaveAttribute("href", "/");
  });

  it("retries when the retry button is clicked", () => {
    const retry = vi.fn<() => void>();

    render(<DashboardError error={new Error("failed")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows the digest so that the error can be found in the logs", () => {
    const error = Object.assign(new Error("failed"), { digest: "1234567890" });

    render(<DashboardError error={error} retry={vi.fn<() => void>()} />);

    expect(screen.getByText("1234567890")).toBeInTheDocument();
  });

  it("reports the error to Sentry", () => {
    const error = new Error("failed");

    render(<DashboardError error={error} retry={vi.fn<() => void>()} />);

    expect(mocks.captureException).toHaveBeenCalledWith(error);
  });
});
