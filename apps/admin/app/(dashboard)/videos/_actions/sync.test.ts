import { CACHE_TAGS } from "@shinju-date/constants";
import type { RefreshVideoResult, Scraper } from "@shinju-date/scraper";
import { toDBString } from "@shinju-date/temporal-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { createScraper } from "@/lib/scraper";
import { setupActionTest } from "@/test/action-harness";

import { syncVideoAction } from "./sync";

const scraper = vi.hoisted(() => ({
  createScraper: vi.fn<typeof createScraper>(),
  refreshVideo: vi.fn<Scraper["refreshVideo"]>(),
}));

vi.mock(import("@/lib/scraper"), () => ({
  createScraper: scraper.createScraper,
}));

const test = setupActionTest();

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、`@/test/action-harness` のモックより先に `@/lib/auth` が
 * 読み込まれてしまうため、ここに書く。
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";
const { supabase } = test;

const now = Temporal.Instant.from("2024-11-24T17:00:00Z");

vi.spyOn(Temporal.Now, "instant").mockReturnValue(now);

const videoId = "30000000-0000-0000-0000-000000000101";

function saveVideo(platform: "twitch" | "youtube" = "youtube") {
  supabase.on("select", "videos", [{ platform, title: "Saved Title" }]);
}

function refreshTo(result: RefreshVideoResult) {
  scraper.refreshVideo.mockResolvedValue(result);
}

const revalidated = {
  paths: [`/videos/${videoId}`, "/videos"],
  tags: [[CACHE_TAGS.VIDEOS]],
};

describe("syncVideoAction()", () => {
  beforeEach(() => {
    scraper.createScraper.mockReturnValue({
      refreshVideo: scraper.refreshVideo,
    } as Partial<Scraper> as Scraper);
  });

  it.each(["youtube", "twitch"] as const)(
    "refreshes a %s video with the scraper of its platform",
    async (platform) => {
      saveVideo(platform);
      refreshTo({ status: "unchanged", title: "Saved Title" });

      await syncVideoAction(videoId);

      expect(scraper.createScraper).toHaveBeenCalledWith(platform);
      expect(scraper.refreshVideo).toHaveBeenCalledWith(videoId, now);
    }
  );

  it("records the changed columns and revalidates when the video was updated", async () => {
    saveVideo();
    refreshTo({
      after: { title: "New Title", video_kind: "short" },
      before: { title: "Saved Title", video_kind: "standard" },
      status: "updated",
      title: "New Title",
    });

    const result = await syncVideoAction(videoId);

    expect(result).toStrictEqual({
      data: { message: "動画情報を同期しました。" },
      success: true,
    });
    test.expectAuditLog("VIDEO_SYNC", videoId, {
      changes: {
        after: { title: "New Title", video_kind: "short" },
        before: { title: "Saved Title", video_kind: "standard" },
      },
      entityName: "New Title",
    });
    test.expectRevalidated(revalidated);
  });

  it("reports an up-to-date video without recording or revalidating", async () => {
    saveVideo();
    refreshTo({ status: "unchanged", title: "Saved Title" });

    const result = await syncVideoAction(videoId);

    expect(result).toStrictEqual({
      data: { message: "動画情報は既に最新です。", unchanged: true },
      success: true,
    });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it.each([
    ["youtube", "YouTube"],
    ["twitch", "Twitch"],
  ] as const)(
    "records the soft deletion of a %s video the platform no longer returns",
    async (platform, label) => {
      saveVideo(platform);
      refreshTo({ status: "unavailable" });

      const result = await syncVideoAction(videoId);

      expect(result).toStrictEqual({
        data: {
          message: `${label}で動画が見つからなかったため、動画を削除しました。`,
        },
        success: true,
      });
      test.expectAuditLog("VIDEO_SYNC", videoId, {
        changes: {
          after: {
            deleted_at: toDBString(now),
            deleted_reason: "unavailable",
          },
          before: { deleted_at: null },
        },
        entityName: "Saved Title",
      });
      test.expectRevalidated(revalidated);
    }
  );

  it("reports a video the scraper did not find", async () => {
    saveVideo();
    refreshTo({ status: "not-found" });

    const result = await syncVideoAction(videoId);

    expect(result).toStrictEqual({
      error: "動画が見つかりませんでした。",
      success: false,
    });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it("reports a video that is not saved without calling the scraper", async () => {
    supabase.on("select", "videos", []);

    const result = await syncVideoAction(videoId);

    expect(result).toStrictEqual({
      error: "動画が見つかりませんでした。",
      success: false,
    });
    expect(scraper.createScraper).not.toHaveBeenCalled();
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it("reports a failure of the scraper", async () => {
    saveVideo();
    scraper.refreshVideo.mockRejectedValue(new Error("YouTube is down"));

    const result = await syncVideoAction(videoId);

    expect(result).toStrictEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    });
    expect(test.logger.error).toHaveBeenCalledWith(
      "Server Action が失敗しました",
      expect.objectContaining({
        action: "syncVideoAction",
        args: [videoId],
      })
    );
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it.each([
    ["an id that is not a UUID", "video-1"],
    ["an empty id", ""],
    ["a value that is not a string", ["30000000-0000-0000-0000-000000000101"]],
  ])("returns an error without syncing anything for %s", async (_, id) => {
    const result = await syncVideoAction(id as string);

    expect(result).toStrictEqual({
      error: "入力が正しくありません。",
      success: false,
    });
    expect(supabase.requests).toHaveLength(0);
    expect(scraper.refreshVideo).not.toHaveBeenCalled();
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });
});
