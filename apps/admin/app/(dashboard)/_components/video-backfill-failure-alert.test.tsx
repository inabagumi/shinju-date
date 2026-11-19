import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { countVideoBackfillFailures } from "../_lib/count-video-backfill-failures";

const mocks = vi.hoisted(() => ({
  countVideoBackfillFailures: vi.fn<typeof countVideoBackfillFailures>(),
}));

vi.mock(import("../_lib/count-video-backfill-failures"), () => ({
  countVideoBackfillFailures: mocks.countVideoBackfillFailures,
}));
vi.mock(import("@shinju-date/logger"), async () => {
  const { createMockLogger } = await import("@/test/logger");

  return { logger: createMockLogger() };
});

const { VideoBackfillFailureAlert } =
  await import("./video-backfill-failure-alert");

describe("VideoBackfillFailureAlert", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("tells how many accounts failed and links to the history", async () => {
    mocks.countVideoBackfillFailures.mockResolvedValue(3);

    render(await VideoBackfillFailureAlert());

    expect(screen.getByRole("alert").textContent).toContain(
      "過去動画の取り込みが失敗したアカウントが3件あります。"
    );
    expect(
      screen
        .getByRole("link", { name: "履歴を確認して再試行する" })
        .getAttribute("href")
    ).toBe("/system#video-backfill-history");
  });

  it("renders nothing while there is no failure", async () => {
    mocks.countVideoBackfillFailures.mockResolvedValue(0);

    await expect(VideoBackfillFailureAlert()).resolves.toBeNull();
  });

  it("renders nothing when the failures cannot be counted", async () => {
    mocks.countVideoBackfillFailures.mockRejectedValue(
      new Error("permission denied")
    );

    await expect(VideoBackfillFailureAlert()).resolves.toBeNull();
  });
});
