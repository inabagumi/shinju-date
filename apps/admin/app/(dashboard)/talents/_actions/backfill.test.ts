import type { BackfillQueue } from "@shinju-date/video-backfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupActionTest } from "@/test/action-harness";
import { createBackfillJob } from "@/test/factories";

import {
  getVideoBackfillStatusAction,
  requestVideoBackfillAction,
} from "./backfill";

const mocks = vi.hoisted(() => ({
  enqueue: vi.fn<BackfillQueue["enqueue"]>(),
  getJobs: vi.fn<BackfillQueue["getJobs"]>(),
}));

vi.mock(import("@shinju-date/video-backfill"), async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    // The real constructor only keeps the Redis client
    BackfillQueue: class extends original.BackfillQueue {
      // oxlint-disable-next-line eslint/class-methods-use-this -- overrides an instance method of the real class
      override enqueue(...args: Parameters<BackfillQueue["enqueue"]>) {
        return mocks.enqueue(...args);
      }

      // oxlint-disable-next-line eslint/class-methods-use-this -- overrides an instance method of the real class
      override getJobs(...args: Parameters<BackfillQueue["getJobs"]>) {
        return mocks.getJobs(...args);
      }
    },
  };
});

const test = setupActionTest();
const { supabase } = test;

describe("talent backfill actions", () => {
  beforeEach(() => {
    test.signIn({ id: "user-1" });
  });

  const talentId = "123e4567-e89b-12d3-a456-426614174000";
  const talent = {
    name: "Talent",
    twitch_users: [
      {
        id: "twitch-row-1",
        name: null,
        twitch_login_name: "alice",
        twitch_user_id: "1001",
      },
    ],
    youtube_channels: [
      { id: "channel-row-1", name: "Main", youtube_channel_id: "UCaaa" },
      { id: "channel-row-2", name: null, youtube_channel_id: "UCbbb" },
    ],
  };

  describe("requestVideoBackfillAction()", () => {
    beforeEach(() => {
      supabase.on("select", "talents", [talent]);
      mocks.enqueue.mockResolvedValue({
        enqueued: true,
        job: createBackfillJob(),
      });
    });

    it("queues one job per account of the platform and records who asked", async () => {
      await expect(
        requestVideoBackfillAction(talentId, "youtube")
      ).resolves.toMatchObject({ success: true });

      expect(mocks.enqueue.mock.calls).toStrictEqual([
        [
          {
            accountId: "channel-row-1",
            provider: "youtube",
            requestedBy: "user-1",
            talentId,
          },
        ],
        [
          {
            accountId: "channel-row-2",
            provider: "youtube",
            requestedBy: "user-1",
            talentId,
          },
        ],
      ]);
      expect(test.createAuditLog).toHaveBeenCalledWith(
        supabase.client,
        "VIDEO_BACKFILL",
        talentId,
        {
          accounts: [
            { accountId: "channel-row-1", name: "Main" },
            { accountId: "channel-row-2", name: "UCbbb" },
          ],
          entityName: "Talent",
          platform: "youtube",
        }
      );
    });

    it("refuses while every job of the platform is still running", async () => {
      mocks.enqueue.mockResolvedValue({
        enqueued: false,
        job: createBackfillJob(),
      });

      await expect(
        requestVideoBackfillAction(talentId, "twitch")
      ).resolves.toStrictEqual({
        error: "Twitchの過去動画の取り込みは既に実行中です。",
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("reports the accounts that were skipped", async () => {
      mocks.enqueue
        .mockResolvedValueOnce({ enqueued: false, job: createBackfillJob() })
        .mockResolvedValueOnce({ enqueued: true, job: createBackfillJob() });

      const result = await requestVideoBackfillAction(talentId, "youtube");

      expect(result).toStrictEqual({
        data: {
          message:
            "YouTubeの過去動画の取り込みを1件キューに追加しました（実行中の1件は除く）。",
        },
        success: true,
      });
      expect(test.createAuditLog).toHaveBeenCalledWith(
        supabase.client,
        "VIDEO_BACKFILL",
        talentId,
        expect.objectContaining({
          accounts: [{ accountId: "channel-row-2", name: "UCbbb" }],
        })
      );
    });

    it("succeeds with a warning and records the jobs that were queued when another one fails", async () => {
      mocks.enqueue
        .mockResolvedValueOnce({ enqueued: true, job: createBackfillJob() })
        .mockRejectedValueOnce(new Error("redis unavailable"));

      await expect(
        requestVideoBackfillAction(talentId, "youtube")
      ).resolves.toStrictEqual({
        data: {
          message: "YouTubeの過去動画の取り込みを1件キューに追加しました。",
        },
        success: true,
        warnings: [
          "YouTubeの過去動画の取り込みのうち、1件はキューに追加できませんでした。",
        ],
      });
      expect(test.createAuditLog).toHaveBeenCalledWith(
        supabase.client,
        "VIDEO_BACKFILL",
        talentId,
        expect.objectContaining({
          accounts: [{ accountId: "channel-row-1", name: "Main" }],
        })
      );
    });

    it("reports a failure without an audit log when nothing was queued", async () => {
      mocks.enqueue.mockRejectedValue(new Error("redis unavailable"));

      await expect(
        requestVideoBackfillAction(talentId, "twitch")
      ).resolves.toStrictEqual({
        error: "Twitchの過去動画の取り込みをキューに追加できませんでした。",
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("rejects a talent without accounts of the platform", async () => {
      supabase.on("select", "talents", [{ ...talent, twitch_users: [] }]);

      await expect(
        requestVideoBackfillAction(talentId, "twitch")
      ).resolves.toStrictEqual({
        error: "このタレントに紐づくTwitchアカウントはありません。",
        success: false,
      });
      expect(mocks.enqueue).not.toHaveBeenCalled();
    });

    it("rejects a talent that is deleted or unknown", async () => {
      supabase.on("select", "talents", []);

      await expect(
        requestVideoBackfillAction(talentId, "youtube")
      ).resolves.toStrictEqual({
        error: "タレントが見つかりませんでした。",
        success: false,
      });
    });

    it.each([
      ["an unknown platform", talentId, "niconico"],
      ["a talent ID that is not a UUID", "talent-1", "youtube"],
      ["no talent ID", "", "youtube"],
    ])("rejects %s without queueing anything", async (_, id, provider) => {
      await expect(
        requestVideoBackfillAction(id, provider as "youtube")
      ).resolves.toStrictEqual({
        error: "入力が正しくありません。",
        success: false,
      });
      expect(supabase.requests).toStrictEqual([]);
      expect(mocks.enqueue).not.toHaveBeenCalled();
      test.expectNoAuditLog();
    });
  });

  describe("getVideoBackfillStatusAction()", () => {
    beforeEach(() => {
      supabase.on("select", "talents", [talent]);
    });

    it("rejects a talent ID that is not a UUID without reading anything", async () => {
      await expect(
        getVideoBackfillStatusAction("talent-1")
      ).resolves.toStrictEqual({
        error: "入力が正しくありません。",
        success: false,
      });
      expect(supabase.requests).toStrictEqual([]);
    });

    it("returns the progress of every account", async () => {
      mocks.getJobs.mockResolvedValue([
        {
          active: true,
          job: createBackfillJob({
            added: 12,
            error: null,
            finishedAt: null,
            pages: 3,
            requestedAt: "2026-11-14T00:00:00Z",
            status: "running",
            updatedAt: "2026-11-14T00:02:00Z",
          }),
          status: "running",
        },
        null,
        null,
      ]);

      const result = await getVideoBackfillStatusAction(talentId);

      expect(mocks.getJobs).toHaveBeenCalledWith([
        "youtube:channel-row-1",
        "youtube:channel-row-2",
        "twitch:twitch-row-1",
      ]);
      expect(result).toStrictEqual({
        data: {
          accounts: [
            expect.objectContaining({
              accountId: "channel-row-1",
              active: true,
              added: 12,
              name: "Main",
              status: "running",
            }),
            expect.objectContaining({
              accountId: "channel-row-2",
              active: false,
              added: 0,
              status: null,
            }),
            expect.objectContaining({
              accountId: "twitch-row-1",
              name: "alice",
              provider: "twitch",
              status: null,
            }),
          ],
          success: true,
        },
        success: true,
      });
    });

    it("shows a job that stopped without finishing as interrupted", async () => {
      mocks.getJobs.mockResolvedValue([
        {
          active: false,
          job: createBackfillJob({
            added: 4,
            error: null,
            finishedAt: null,
            pages: 1,
            requestedAt: "2026-11-14T00:00:00Z",
            status: "running",
            updatedAt: "2026-11-14T00:02:00Z",
          }),
          // As `getJobActivity` tells a job whose worker died.
          status: "interrupted",
        },
        null,
        null,
      ]);

      const result = await getVideoBackfillStatusAction(talentId);

      expect(result).toMatchObject({
        data: {
          accounts: [
            {
              accountId: "channel-row-1",
              active: false,
              status: "interrupted",
            },
            { status: null },
            { status: null },
          ],
        },
        success: true,
      });
    });
  });
});
