import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TimerProvider, useNow } from "./timer";

function Now() {
  return <p>{useNow().toString({ timeZoneName: "never" })}</p>;
}

const INITIAL_NOW = "2026-11-14T12:00:00+09:00[Asia/Tokyo]";

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Temporal.Now, "zonedDateTimeISO").mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-15T00:30:00+09:00[Asia/Tokyo]")
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should start from the initial time of the provider, not the clock", () => {
    const html = renderToString(
      <TimerProvider initialNow={INITIAL_NOW}>
        <Now />
      </TimerProvider>
    );

    expect(html).toContain("2026-11-14T12:00:00+09:00");
    expect(Temporal.Now.zonedDateTimeISO).not.toHaveBeenCalled();
  });

  it("should switch to the clock after the mount and follow it", () => {
    render(
      <TimerProvider initialNow={INITIAL_NOW}>
        <Now />
      </TimerProvider>
    );

    expect(screen.getByText("2026-11-15T00:30:00+09:00")).toBeInTheDocument();

    vi.mocked(Temporal.Now.zonedDateTimeISO).mockReturnValue(
      Temporal.ZonedDateTime.from("2026-11-15T00:31:00+09:00[Asia/Tokyo]")
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("2026-11-15T00:31:00+09:00")).toBeInTheDocument();
  });

  it("should read the clock outside the provider", () => {
    render(<Now />);

    expect(screen.getByText("2026-11-15T00:30:00+09:00")).toBeInTheDocument();
  });
});
