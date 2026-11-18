import type {
  BackfillRun,
  BackfillRunJob,
  BackfillRunRequest,
  BackfillRuns,
  StartBackfillRunOptions,
} from "@shinju-date/video-backfill";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { setupActionTest } from "@/test/action-harness";

import {
  getVideoBackfillRunAction,
  requestVideoBackfillRunAction,
} from "./video-backfill-run";

const mocks = vi.hoisted(() => ({
  getLatest: vi.fn<BackfillRuns["getLatest"]>(),
  start: vi.fn<BackfillRuns["start"]>(),
}));

vi.mock(import("@shinju-date/video-backfill"), async (importOriginal) => {
  const original = await importOriginal();

  return {
    ...original,
    // The real constructor only keeps the Redis client
    BackfillRuns: class extends original.BackfillRuns {
      override getLatest(...args: Parameters<BackfillRuns["getLatest"]>) {
        return mocks.getLatest(...args);
      }

      override start(...args: Parameters<BackfillRuns["start"]>) {
        return mocks.start(...args);
      }
    },
  };
});

const test = setupActionTest();
const { supabase } = test;

describe("video backfill run actions", () => {
  beforeEach(() => {
    test.signIn({ id: "user-1" });
  });

  const runId = "123e4567-e89b-12d3-a456-426614174000";
  const talents = [
    {
      id: "talent-1",
      name: "Alice",
      status: "active",
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
      ],
    },
    {
      id: "talent-2",
      name: "Bob",
      status: "retired",
      twitch_users: [],
      youtube_channels: [
        { id: "channel-row-2", name: null, youtube_channel_id: "UCbbb" },
      ],
    },
  ];
  const youtubeRunJob: BackfillRunJob = {
    accountId: "channel-row-1",
    addedBefore: 0,
    id: "youtube:channel-row-1",
    provider: "youtube",
    talentId: "talent-1",
  };
  const twitchRunJob: BackfillRunJob = {
    accountId: "twitch-row-1",
    addedBefore: 0,
    id: "twitch:twitch-row-1",
    provider: "twitch",
    talentId: "talent-1",
  };
  const run: BackfillRun = {
    failed: 0,
    id: runId,
    jobs: [youtubeRunJob, twitchRunJob],
    requestedAt: "2026-11-14T00:00:00Z",
    requestedBy: "user-1",
    skipped: 0,
  };

  /** Makes `start()` report that the request at `index` failed. */
  const failRequest = (
    requests: readonly BackfillRunRequest[],
    { onError }: StartBackfillRunOptions,
    index: number
  ): void => {
    const request = requests[index];

    if (!request || !onError) {
      throw new Error("start() got neither the request nor onError");
    }

    onError(request, new Error("redis unavailable"));
  };

  describe("requestVideoBackfillRunAction()", () => {
    beforeEach(() => {
      supabase.on("select", "talents", talents);
      mocks.start.mockResolvedValue({
        failed: 0,
        run,
        skipped: 0,
        status: "started",
      });
    });

    it("queues the accounts of active talents and records who asked", async () => {
      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        data: {
          message: "全タレントの取得漏れチェックを2件キューに追加しました。",
        },
        success: true,
      });

      expect(mocks.start).toHaveBeenCalledExactlyOnceWith(
        [
          expect.objectContaining({
            accountId: "channel-row-1",
            provider: "youtube",
            talentId: "talent-1",
          }),
          expect.objectContaining({
            accountId: "twitch-row-1",
            provider: "twitch",
            talentId: "talent-1",
          }),
        ],
        expect.objectContaining({ requestedBy: "user-1" })
      );
      expect(test.createAuditLog).toHaveBeenCalledExactlyOnceWith(
        supabase.client,
        "VIDEO_BACKFILL",
        runId,
        {
          accounts: 2,
          entityName: "全タレントの取得漏れチェック（2件）",
          failed: 0,
          scope: "all",
          skipped: 0,
          targets: { twitch: 1, youtube: 1 },
        }
      );
    });

    it("refuses while the latest check is in progress", async () => {
      mocks.start.mockResolvedValue({
        progress: {
          active: true,
          added: 0,
          counts: {
            done: 0,
            failed: 0,
            interrupted: 0,
            pending: 1,
            running: 1,
          },
          jobs: [],
          run,
        },
        status: "active",
      });

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        error: "全タレントの取得漏れチェックは既に実行中です。",
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("refuses while another request is being handled", async () => {
      mocks.start.mockResolvedValue({ status: "busy" });

      await expect(requestVideoBackfillRunAction()).resolves.toMatchObject({
        error: expect.stringContaining(
          "別の取得漏れチェックの依頼を処理しています"
        ),
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("reports when every account is being backfilled already", async () => {
      mocks.start.mockResolvedValue({ failed: 0, skipped: 2, status: "empty" });

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        error: "すべてのアカウントで過去動画の取り込みが実行中です。",
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("reports the accounts that were skipped or could not be queued", async () => {
      mocks.start.mockImplementation(async (requests, options) => {
        failRequest(requests, options, 1);

        return { failed: 1, run, skipped: 3, status: "started" };
      });

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        data: {
          message:
            "全タレントの取得漏れチェックを2件キューに追加しました（実行中の3件は除く）。",
        },
        success: true,
        warnings: [
          "取得漏れチェックのうち、1件はキューに追加できませんでした。",
        ],
      });
      expect(test.createAuditLog).toHaveBeenCalledWith(
        supabase.client,
        "VIDEO_BACKFILL",
        runId,
        expect.objectContaining({ failed: 1, skipped: 3 })
      );
    });

    it("reports a failure without an audit log when nothing was queued", async () => {
      mocks.start.mockImplementation(async (requests, options) => {
        failRequest(requests, options, 0);

        return { failed: 2, skipped: 0, status: "empty" };
      });

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        error: "取得漏れチェックをキューに追加できませんでした。",
        success: false,
      });
      expect(test.createAuditLog).not.toHaveBeenCalled();
    });

    it("rejects when no active talent has an account", async () => {
      supabase.on("select", "talents", [talents[1]]);

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        error: "active なタレントに紐づくアカウントはありません。",
        success: false,
      });
      expect(mocks.start).not.toHaveBeenCalled();
    });

    it("hides the message of an unexpected error", async () => {
      // supabase-js returns a PostgREST error as a plain object, so throw an
      // `Error` from the client to reach the message.
      vi.spyOn(supabase.client, "from").mockImplementationOnce(() => {
        throw new Error("database unavailable");
      });

      await expect(requestVideoBackfillRunAction()).resolves.toStrictEqual({
        error: "処理に失敗しました。時間をおいて、もう一度お試しください。",
        success: false,
      });
      expect(mocks.start).not.toHaveBeenCalled();
    });
  });

  describe("getVideoBackfillRunAction()", () => {
    beforeEach(() => {
      supabase.on("select", "talents", talents);
    });

    it("returns the targets without a check", async () => {
      mocks.getLatest.mockResolvedValue(null);

      await expect(getVideoBackfillRunAction()).resolves.toStrictEqual({
        data: {
          run: null,
          success: true,
          targets: { twitch: 1, youtube: 1 },
        },
        success: true,
      });
    });

    it("returns the progress of the latest check with account names", async () => {
      mocks.getLatest.mockResolvedValue({
        active: true,
        added: 5,
        counts: { done: 1, failed: 0, interrupted: 0, pending: 0, running: 2 },
        jobs: [
          {
            ...youtubeRunJob,
            active: true,
            added: 5,
            error: null,
            status: "running",
            updatedAt: "2026-11-14T00:02:00Z",
          },
          {
            ...twitchRunJob,
            active: false,
            added: 0,
            error: null,
            status: "done",
            updatedAt: "2026-11-14T00:01:00Z",
          },
          // An account that was removed since.
          {
            accountId: "channel-row-9",
            active: true,
            added: 0,
            addedBefore: 0,
            error: null,
            id: "youtube:channel-row-9",
            provider: "youtube",
            status: "running",
            talentId: "talent-9",
            updatedAt: null,
          },
        ],
        run: { ...run, skipped: 1 },
      });

      const result = await getVideoBackfillRunAction();

      expect(result).toMatchObject({
        data: {
          run: {
            active: true,
            added: 5,
            counts: { done: 1, running: 2 },
            id: runId,
            requestedAt: "2026-11-14T00:00:00Z",
            skipped: 1,
          },
        },
        success: true,
      });
      expect(result).toHaveProperty("data.run.accounts", [
        expect.objectContaining({
          accountId: "channel-row-1",
          added: 5,
          name: "Main",
          talentName: "Alice",
        }),
        expect.objectContaining({
          accountId: "twitch-row-1",
          name: "alice",
          status: "done",
          talentName: "Alice",
        }),
        expect.objectContaining({
          accountId: "channel-row-9",
          name: null,
          talentName: null,
        }),
      ]);
    });
  });
});
