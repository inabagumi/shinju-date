import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import ErrorPage from "./error";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

describe("ErrorPage", () => {
  test("should render the heading in Japanese", () => {
    render(<ErrorPage error={new Error("failed")} retry={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "ページを表示できませんでした",
      })
    ).toBeInTheDocument();
  });

  test("should retry when the retry button is clicked", () => {
    const retry = vi.fn();

    render(<ErrorPage error={new Error("failed")} retry={retry} />);

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(retry).toHaveBeenCalledOnce();
  });

  test("should render a link to the top page", () => {
    render(<ErrorPage error={new Error("failed")} retry={vi.fn()} />);

    expect(
      screen.getByRole("link", { name: "トップページへ" })
    ).toHaveAttribute("href", "/");
  });

  test("should report the error to Sentry", () => {
    const error = new Error("failed");

    render(<ErrorPage error={error} retry={vi.fn()} />);

    expect(mocks.captureException).toHaveBeenCalledWith(error);
  });
});
