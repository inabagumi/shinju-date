import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchOldestVideoDate, fetchScheduleToday } from "@/lib/data/schedule";
import { createOgImage } from "@/lib/og-image";

import Image from "./opengraph-image";
import { generateMetadata } from "./page";

vi.mock(import("@/lib/data/schedule"), async (importOriginal) => ({
  ...(await importOriginal()),
  fetchOldestVideoDate: vi.fn<typeof fetchOldestVideoDate>(),
  fetchScheduleToday: vi.fn<typeof fetchScheduleToday>(),
}));

// The title is in Japanese, whose fonts `ImageResponse` would fetch
vi.mock(import("@/lib/og-image"), async (importOriginal) => ({
  ...(await importOriginal()),
  createOgImage: vi.fn<typeof createOgImage>(),
}));

const render = (date: string) => Image({ params: Promise.resolve({ date }) });

describe("opengraph-image of the schedule of a week", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchOldestVideoDate).mockResolvedValue("2020-01-01");
    vi.mocked(fetchScheduleToday).mockResolvedValue("2026-11-10");
  });

  it("should have the title of the page", async () => {
    // A Tuesday. The image is that of the week, as is the page.
    await render("2026-11-10");

    const metadata = await generateMetadata({
      params: Promise.resolve({ date: "2026-11-10" }),
    });

    expect(createOgImage).toHaveBeenCalledWith(
      "2026年11月8日〜11月14日の配信スケジュール"
    );
    expect(metadata.openGraph?.title).toBe(
      "2026年11月8日〜11月14日の配信スケジュール"
    );
  });

  it.each([
    ["a date that cannot be read", "not-a-date"],
    ["a week before that of the oldest video", "2019-12-28"],
  ])("should be not found for %s", async (_, date) => {
    await expect(render(date)).rejects.toMatchObject({
      digest: "NEXT_HTTP_ERROR_FALLBACK;404",
    });
    expect(createOgImage).not.toHaveBeenCalled();
  });
});
