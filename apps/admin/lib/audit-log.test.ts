import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TypedSupabaseClient } from "@/lib/supabase";

import {
  type AuditLogDetails,
  createAuditLog,
  createAuditLogs,
} from "./audit-log";

const mocks = vi.hoisted(() => ({
  logger: { error: vi.fn() },
  rpc: vi.fn<(...args: unknown[]) => Promise<{ error: unknown }>>(async () => ({
    error: null,
  })),
}));

vi.mock("@shinju-date/logger", () => ({ logger: mocks.logger }));

/** The client of the signed-in user, which only has `rpc()`. */
const client = { rpc: mocks.rpc } as unknown as TypedSupabaseClient;

beforeEach(() => {
  mocks.rpc.mockReset();
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.logger.error.mockReset();
});

describe("createAuditLog", () => {
  it("records the target table that the action is about", async () => {
    await createAuditLog(client, "VIDEO_DELETE", "video-1", {
      entityName: "Video",
    });

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_log", {
      p_action: "VIDEO_DELETE",
      p_details: { entityName: "Video" },
      p_target_record_id: "video-1",
      p_target_table: "videos",
    });
  });

  it("records no details and no record ID for an action without them", async () => {
    await createAuditLog(client, "MAINTENANCE_MODE_ENABLE", null);

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_log", {
      p_action: "MAINTENANCE_MODE_ENABLE",
      p_details: null,
      p_target_table: "redis:system",
    });
  });

  it.each([
    "CHANNEL_ACTIVATE",
    "CHANNEL_CREATE",
    "CHANNEL_DELETE",
    "CHANNEL_RESTORE",
    "CHANNEL_RETIRE",
    "CHANNEL_UPDATE",
  ] as const)("records %s against the talent", async (action) => {
    await createAuditLog(client, action, "talent-1", { entityName: "Talent" });

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_log", {
      p_action: action,
      p_details: { entityName: "Talent" },
      p_target_record_id: "talent-1",
      p_target_table: "talents",
    });
  });

  it("records a sync of a talent against the talent", async () => {
    await createAuditLog(client, "CHANNEL_SYNC", "talent-1", {
      accounts: [{ id: "account-1", name: "Account" }],
      entityName: "Talent",
      platform: "twitch",
    });

    expect(mocks.rpc).toHaveBeenCalledWith(
      "insert_audit_log",
      expect.objectContaining({ p_target_table: "talents" })
    );
  });

  it.each(["TWITCH_USER_CREATE", "TWITCH_USER_DELETE"] as const)(
    "records %s against the talent of the Twitch user",
    async (action) => {
      await createAuditLog(client, action, "talent-1", {
        account: {
          id: "twitch-user-1",
          name: "Account",
          twitch_login_name: "account",
          twitch_user_id: "12345678",
        },
        entityName: "Talent",
      });

      expect(mocks.rpc).toHaveBeenCalledWith(
        "insert_audit_log",
        expect.objectContaining({
          p_target_record_id: "talent-1",
          p_target_table: "talents",
        })
      );
    }
  );

  it.each(["YOUTUBE_CHANNEL_CREATE", "YOUTUBE_CHANNEL_DELETE"] as const)(
    "records %s against the talent of the YouTube channel",
    async (action) => {
      await createAuditLog(client, action, "talent-1", {
        account: {
          id: "channel-1",
          name: "Account",
          youtube_channel_id: "UC1234567890123456789012",
          youtube_handle: "@account",
        },
        entityName: "Talent",
      });

      expect(mocks.rpc).toHaveBeenCalledWith(
        "insert_audit_log",
        expect.objectContaining({
          p_target_record_id: "talent-1",
          p_target_table: "talents",
        })
      );
    }
  );

  it.each<AuditLogDetails<"FEATURE_REQUEST_UPDATE">>([
    {
      changes: {
        after: { status: "resolved" },
        before: { status: "pending" },
      },
      entityName: "Feedback",
    },
    {
      changes: { after: { hasMemo: true }, before: { hasMemo: false } },
      entityName: "Feedback",
    },
  ])(
    "records an update of a feedback against the feedback",
    async (details) => {
      await createAuditLog(
        client,
        "FEATURE_REQUEST_UPDATE",
        "feedback-1",
        details
      );

      expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_log", {
        p_action: "FEATURE_REQUEST_UPDATE",
        p_details: details,
        p_target_record_id: "feedback-1",
        p_target_table: "feature_requests",
      });
    }
  );

  it("records a backfill of a talent against the talent", async () => {
    await createAuditLog(client, "VIDEO_BACKFILL", "talent-1", {
      accounts: [{ accountId: "account-1", name: "Account" }],
      entityName: "Talent",
      platform: "youtube",
    });

    expect(mocks.rpc).toHaveBeenCalledWith(
      "insert_audit_log",
      expect.objectContaining({ p_target_table: "talents" })
    );
  });

  it.each<AuditLogDetails<"VIDEO_BACKFILL">>([
    {
      accounts: 2,
      entityName: "全タレントの取得漏れチェック（2件）",
      failed: 0,
      scope: "all",
      skipped: 0,
      targets: { twitch: 1, youtube: 1 },
    },
    {
      accounts: [],
      entityName: "失敗した過去動画の取り込みの再試行（0件）",
      failed: 0,
      scope: "retry",
      skipped: 0,
    },
  ])(
    "records a backfill of all talents ($scope) against the backfill queue",
    async (details) => {
      await createAuditLog(client, "VIDEO_BACKFILL", null, details);

      expect(mocks.rpc).toHaveBeenCalledWith(
        "insert_audit_log",
        expect.objectContaining({ p_target_table: "redis:video-backfill" })
      );
    }
  );

  it("logs a failure of the RPC and does not throw", async () => {
    const error = { code: "42501", message: "permission denied" };
    mocks.rpc.mockResolvedValue({ error });

    await expect(
      createAuditLog(client, "VIDEO_DELETE", "video-1", {
        entityName: "Video",
      })
    ).resolves.toBeUndefined();

    expect(mocks.logger.error).toHaveBeenCalledExactlyOnceWith(
      "監査ログの記録に失敗しました",
      { action: "VIDEO_DELETE", error, targetRecordId: "video-1" }
    );
  });

  it("logs an exception and does not throw", async () => {
    const error = new Error("Network error");
    mocks.rpc.mockRejectedValue(error);

    await expect(
      createAuditLog(client, "MAINTENANCE_MODE_ENABLE", null)
    ).resolves.toBeUndefined();

    expect(mocks.logger.error).toHaveBeenCalledExactlyOnceWith(
      "監査ログの記録に失敗しました",
      { action: "MAINTENANCE_MODE_ENABLE", error, targetRecordId: undefined }
    );
  });
});

describe("createAuditLogs", () => {
  it("records all entries with one call of the RPC", async () => {
    await createAuditLogs(client, [
      {
        action: "VIDEO_DELETE",
        details: { entityName: "Video 1" },
        targetRecordId: "video-1",
      },
      {
        action: "VIDEO_DELETE",
        details: { entityName: "Video 2" },
        targetRecordId: "video-2",
      },
    ]);

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_logs", {
      p_entries: [
        {
          action: "VIDEO_DELETE",
          details: { entityName: "Video 1" },
          target_record_id: "video-1",
          target_table: "videos",
        },
        {
          action: "VIDEO_DELETE",
          details: { entityName: "Video 2" },
          target_record_id: "video-2",
          target_table: "videos",
        },
      ],
    });
  });

  it("records each entry as createAuditLog records it", async () => {
    await createAuditLogs(client, [
      { action: "MAINTENANCE_MODE_ENABLE", targetRecordId: null },
      {
        action: "VIDEO_BACKFILL",
        details: {
          accounts: [],
          entityName: "失敗した過去動画の取り込みの再試行（0件）",
          failed: 0,
          scope: "retry",
          skipped: 0,
        },
        targetRecordId: null,
      },
    ]);

    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("insert_audit_logs", {
      p_entries: [
        {
          action: "MAINTENANCE_MODE_ENABLE",
          details: null,
          target_record_id: null,
          target_table: "redis:system",
        },
        expect.objectContaining({
          action: "VIDEO_BACKFILL",
          target_table: "redis:video-backfill",
        }),
      ],
    });
  });

  it("does not call the RPC without entries", async () => {
    await createAuditLogs(client, []);

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("logs a failure with the actions and the targets and does not throw", async () => {
    const error = { code: "42501", message: "permission denied" };
    mocks.rpc.mockResolvedValue({ error });

    await expect(
      createAuditLogs(client, [
        {
          action: "VIDEO_RESTORE",
          details: { entityName: "Video 1" },
          targetRecordId: "video-1",
        },
        {
          action: "VIDEO_RESTORE",
          details: { entityName: "Video 2" },
          targetRecordId: "video-2",
        },
      ])
    ).resolves.toBeUndefined();

    expect(mocks.logger.error).toHaveBeenCalledExactlyOnceWith(
      "監査ログの記録に失敗しました",
      { action: "VIDEO_RESTORE", error, targetRecordId: "video-1,video-2" }
    );
  });
});
