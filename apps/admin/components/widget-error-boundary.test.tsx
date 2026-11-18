import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WidgetErrorBoundary } from "./widget-error-boundary";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
}));

let shouldThrow = true;

function FlakyWidget() {
  if (shouldThrow) {
    throw new Error("failed to load");
  }

  return <p>loaded</p>;
}

describe("WidgetErrorBoundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    // React logs errors caught by boundaries; keep the test output quiet.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the error inside the widget and shows the other widgets", () => {
    render(
      <>
        <WidgetErrorBoundary title="最近のアクティビティ">
          <FlakyWidget />
        </WidgetErrorBoundary>
        <p>other widget</p>
      </>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("最近のアクティビティ");
    expect(
      screen.getByRole("heading", { level: 2, name: "最近のアクティビティ" })
    ).toBeInTheDocument();
    expect(screen.getByText("other widget")).toBeInTheDocument();
  });

  it("renders the widget again when the retry button is clicked", () => {
    render(
      <WidgetErrorBoundary title="最近のアクティビティ">
        <FlakyWidget />
      </WidgetErrorBoundary>
    );

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(screen.getByText("loaded")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the children while nothing fails", () => {
    shouldThrow = false;

    render(
      <WidgetErrorBoundary title="最近のアクティビティ">
        <FlakyWidget />
      </WidgetErrorBoundary>
    );

    expect(screen.getByText("loaded")).toBeInTheDocument();
  });

  it("reports the error to Sentry", () => {
    render(
      <WidgetErrorBoundary title="最近のアクティビティ">
        <FlakyWidget />
      </WidgetErrorBoundary>
    );

    expect(mocks.captureException).toHaveBeenCalledWith(expect.any(Error));
  });
});
