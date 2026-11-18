import { describe, expect, it, vi } from "vitest";

import { setupActionTest } from "@/test/action-harness";
import { createVideo } from "@/test/factories";
import { postgresError } from "@/test/supabase";
import type { SupabaseRequest } from "@/test/supabase";

import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from "./index";

const test = setupActionTest();

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、`@/test/action-harness` のモックより先に `@/lib/auth` が
 * 読み込まれてしまうため、ここに書く。
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";
const { supabase } = test;

/** 引数の検証に失敗したときの文（`@/lib/schemas` の `INVALID_INPUT_ERROR_MESSAGE`） */
const INVALID_INPUT_ERROR = "入力が正しくありません。";

vi.spyOn(Temporal.Now, "instant").mockReturnValue(
  Temporal.Instant.from("2024-11-24T17:00:00Z")
);

/** PostgREST と同じく、関数に渡された動画の ID をすべて返す（すべて更新できた） */
function allVideoIds(request: SupabaseRequest) {
  return (request.body as { p_video_ids: string[] }).p_video_ids;
}

describe("restoreAction", () => {
  it("should return error when videos are not found", async () => {
    supabase.on("select", "videos", []);

    const result = await restoreAction([
      "30000000-0000-0000-0000-000000000001",
    ]);

    expect(result).toEqual({
      error: "動画が見つかりませんでした。",
      success: false,
    });
  });

  it("should restore the videos whatever the reason with one function call", async () => {
    supabase.on("select", "videos", [
      createVideo({
        id: "30000000-0000-0000-0000-000000000001",
        title: "Test Video 1",
      }),
      createVideo({
        id: "30000000-0000-0000-0000-000000000002",
        title: "Test Video 2",
      }),
    ]);
    supabase.on("rpc", "restore_videos", allVideoIds);

    const result = await restoreAction([
      "30000000-0000-0000-0000-000000000001",
      "30000000-0000-0000-0000-000000000002",
    ]);

    expect(result).toEqual({
      data: { skippedCount: 0, updatedCount: 2 },
      success: true,
    });
    // The function restores the thumbnails with the videos, so neither table
    // is updated directly.
    expect(
      supabase.calls("rpc", "restore_videos").map(({ body }) => body)
    ).toEqual([
      {
        p_video_ids: [
          "30000000-0000-0000-0000-000000000001",
          "30000000-0000-0000-0000-000000000002",
        ],
      },
    ]);
    expect(supabase.calls("update", "videos")).toHaveLength(0);
    expect(supabase.calls("update", "thumbnails")).toHaveLength(0);
    // Both videos are recorded with one call
    test.expectAuditLogs([
      {
        action: "VIDEO_RESTORE",
        details: { entityName: "Test Video 1" },
        targetRecordId: "30000000-0000-0000-0000-000000000001",
      },
      {
        action: "VIDEO_RESTORE",
        details: { entityName: "Test Video 2" },
        targetRecordId: "30000000-0000-0000-0000-000000000002",
      },
    ]);
    test.expectRevalidated({
      paths: [
        "/videos",
        "/videos/30000000-0000-0000-0000-000000000001",
        "/videos/30000000-0000-0000-0000-000000000002",
      ],
      tags: [["videos"]],
    });
  });

  it("should count the videos that were not deleted as skipped", async () => {
    supabase.on("select", "videos", [
      createVideo({
        id: "30000000-0000-0000-0000-000000000001",
        title: "Deleted Video",
      }),
      createVideo({
        id: "30000000-0000-0000-0000-000000000002",
        title: "Active Video",
      }),
    ]);
    supabase.on("rpc", "restore_videos", [
      "30000000-0000-0000-0000-000000000001",
    ]);

    const result = await restoreAction([
      "30000000-0000-0000-0000-000000000001",
      "30000000-0000-0000-0000-000000000002",
    ]);

    expect(result).toEqual({
      data: { skippedCount: 1, updatedCount: 1 },
      success: true,
    });
    test.expectAuditLogs([
      {
        action: "VIDEO_RESTORE",
        details: { entityName: "Deleted Video" },
        targetRecordId: "30000000-0000-0000-0000-000000000001",
      },
    ]);
    test.expectRevalidated({
      paths: ["/videos", "/videos/30000000-0000-0000-0000-000000000001"],
      tags: [["videos"]],
    });
  });

  it("should return error when the function fails", async () => {
    supabase.on("select", "videos", [
      createVideo({ id: "30000000-0000-0000-0000-000000000001" }),
    ]);
    supabase.on(
      "rpc",
      "restore_videos",
      postgresError("XX000", "Database error")
    );

    const result = await restoreAction([
      "30000000-0000-0000-0000-000000000001",
    ]);

    expect(result).toEqual({ error: ACTION_FAILED_ERROR, success: false });
    expect(test.logger.error).toHaveBeenCalled();
    test.expectNoAuditLog();
  });

  it("should handle fetch error", async () => {
    supabase.on("select", "videos", postgresError("XX000", "Fetch error"));

    const result = await restoreAction([
      "30000000-0000-0000-0000-000000000001",
    ]);

    expect(result).toEqual({ error: ACTION_FAILED_ERROR, success: false });
  });
});

describe("softDeleteAction", () => {
  it("should withdraw the videos with one function call and record their audit logs with one call", async () => {
    supabase.on("select", "videos", [
      createVideo({
        id: "30000000-0000-0000-0000-000000000001",
        title: "Video 1",
      }),
      createVideo({
        id: "30000000-0000-0000-0000-000000000002",
        title: "Video 2",
      }),
    ]);
    supabase.on("rpc", "soft_delete_videos", allVideoIds);

    const result = await softDeleteAction([
      "30000000-0000-0000-0000-000000000001",
      "30000000-0000-0000-0000-000000000002",
    ]);

    expect(result).toEqual({
      data: { skippedCount: 0, updatedCount: 2 },
      success: true,
    });
    // The function deletes the thumbnails with the videos, so neither table
    // is updated directly.
    expect(
      supabase.calls("rpc", "soft_delete_videos").map(({ body }) => body)
    ).toEqual([
      {
        p_deleted_at: "2024-11-24T17:00:00Z",
        p_reason: "withdrawn",
        p_video_ids: [
          "30000000-0000-0000-0000-000000000001",
          "30000000-0000-0000-0000-000000000002",
        ],
      },
    ]);
    expect(supabase.calls("update", "videos")).toHaveLength(0);
    expect(supabase.calls("update", "thumbnails")).toHaveLength(0);
    test.expectAuditLogs([
      {
        action: "VIDEO_DELETE",
        details: { entityName: "Video 1" },
        targetRecordId: "30000000-0000-0000-0000-000000000001",
      },
      {
        action: "VIDEO_DELETE",
        details: { entityName: "Video 2" },
        targetRecordId: "30000000-0000-0000-0000-000000000002",
      },
    ]);
    test.expectRevalidated({
      paths: [
        "/videos",
        "/videos/30000000-0000-0000-0000-000000000001",
        "/videos/30000000-0000-0000-0000-000000000002",
      ],
      tags: [["videos"]],
    });
  });

  it("should count the videos that were already deleted as skipped", async () => {
    supabase.on("select", "videos", [
      createVideo({
        id: "30000000-0000-0000-0000-000000000001",
        title: "Active Video",
      }),
      createVideo({
        deleted_at: "2024-11-01T00:00:00Z",
        deleted_reason: "talent_deleted",
        id: "30000000-0000-0000-0000-000000000002",
        title: "Deleted Video",
      }),
    ]);
    // The function leaves the deleted video (and its reason) untouched.
    supabase.on("rpc", "soft_delete_videos", [
      "30000000-0000-0000-0000-000000000001",
    ]);

    const result = await softDeleteAction([
      "30000000-0000-0000-0000-000000000001",
      "30000000-0000-0000-0000-000000000002",
    ]);

    expect(result).toEqual({
      data: { skippedCount: 1, updatedCount: 1 },
      success: true,
    });
    test.expectAuditLogs([
      {
        action: "VIDEO_DELETE",
        details: { entityName: "Active Video" },
        targetRecordId: "30000000-0000-0000-0000-000000000001",
      },
    ]);
    test.expectRevalidated({
      paths: ["/videos", "/videos/30000000-0000-0000-0000-000000000001"],
      tags: [["videos"]],
    });
  });

  it("should not record audit logs or revalidate when every video was already deleted", async () => {
    supabase.on("select", "videos", [
      createVideo({ id: "30000000-0000-0000-0000-000000000001" }),
    ]);
    supabase.on("rpc", "soft_delete_videos", []);

    const result = await softDeleteAction([
      "30000000-0000-0000-0000-000000000001",
    ]);

    expect(result).toEqual({
      data: { skippedCount: 1, updatedCount: 0 },
      success: true,
    });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it("should not record audit logs when the function fails", async () => {
    supabase.on("select", "videos", [
      createVideo({ id: "30000000-0000-0000-0000-000000000001" }),
    ]);
    supabase.on(
      "rpc",
      "soft_delete_videos",
      postgresError("XX000", "Database error")
    );

    const result = await softDeleteAction([
      "30000000-0000-0000-0000-000000000001",
    ]);

    expect(result).toEqual({ error: ACTION_FAILED_ERROR, success: false });
    test.expectNoAuditLog();
  });
});

describe("toggleVisibilityAction", () => {
  const videos = [
    createVideo({
      id: "30000000-0000-0000-0000-000000000001",
      title: "Hidden Video",
      visible: false,
    }),
    createVideo({
      id: "30000000-0000-0000-0000-000000000002",
      title: "Visible Video 1",
      visible: true,
    }),
    createVideo({
      id: "30000000-0000-0000-0000-000000000003",
      title: "Visible Video 2",
      visible: true,
    }),
  ];
  const ids = videos.map((video) => video.id);

  interface UpdateOptions {
    /** UPDATE の前にほかの操作で切り替わった動画の ID */
    changedIds?: string[];
  }

  /**
   * PostgREST と同じく、`id=in.(...)` と `visible=eq.*` の両方に合う行を
   * 更新したものとして返す。
   */
  function updatedRows(
    request: SupabaseRequest,
    { changedIds = [] }: UpdateOptions = {}
  ) {
    const targetIds = (request.query["id"] ?? "")
      .replaceAll(/^in\.\(|\)$/g, "")
      .split(",");
    const currentVisible = request.query["visible"] === "eq.true";

    return videos
      .filter(
        (video) =>
          targetIds.includes(video.id) &&
          !changedIds.includes(video.id) &&
          video.visible === currentVisible
      )
      .map(({ id, title }) => ({ id, title }));
  }

  it("should update videos in one query per target visibility", async () => {
    supabase.on("select", "videos", videos);
    supabase.on("update", "videos", (request: SupabaseRequest) =>
      updatedRows(request)
    );

    const result = await toggleVisibilityAction(ids);

    expect(result).toEqual({
      data: { skippedCount: 0, updatedCount: 3 },
      success: true,
    });
    expect(
      supabase.calls("update", "videos").map(({ body, query }) => ({
        body,
        id: query["id"],
        visible: query["visible"],
      }))
    ).toEqual([
      {
        body: { visible: true },
        id: "in.(30000000-0000-0000-0000-000000000001)",
        visible: "eq.false",
      },
      {
        body: { visible: false },
        id: "in.(30000000-0000-0000-0000-000000000002,30000000-0000-0000-0000-000000000003)",
        visible: "eq.true",
      },
    ]);
    test.expectAuditLogs(
      videos.map((video) => ({
        action: "VIDEO_VISIBILITY_TOGGLE",
        details: { entityName: video.title },
        targetRecordId: video.id,
      }))
    );
    test.expectRevalidated({
      paths: ["/videos", ...ids.map((id) => `/videos/${id}`)],
      tags: [["videos"]],
    });
  });

  it("should log and revalidate updated videos when one update fails", async () => {
    supabase.on("select", "videos", videos);
    supabase.on("update", "videos", (request: SupabaseRequest) =>
      request.query["visible"] === "eq.false"
        ? postgresError("XX000", "Database error")
        : updatedRows(request)
    );

    const result = await toggleVisibilityAction(ids);

    expect(result).toEqual({
      error: "2 件を更新し、1 件は失敗しました。",
      success: false,
    });
    test.expectAuditLogs([
      {
        action: "VIDEO_VISIBILITY_TOGGLE",
        details: { entityName: "Visible Video 1" },
        targetRecordId: "30000000-0000-0000-0000-000000000002",
      },
      {
        action: "VIDEO_VISIBILITY_TOGGLE",
        details: { entityName: "Visible Video 2" },
        targetRecordId: "30000000-0000-0000-0000-000000000003",
      },
    ]);
    test.expectRevalidated({
      paths: [
        "/videos",
        "/videos/30000000-0000-0000-0000-000000000002",
        "/videos/30000000-0000-0000-0000-000000000003",
      ],
      tags: [["videos"]],
    });
    expect(test.revalidatePath).not.toHaveBeenCalledWith(
      "/videos/30000000-0000-0000-0000-000000000001"
    );
    expect(test.logger.error).toHaveBeenCalledWith(
      "動画の表示切替に失敗しました",
      expect.objectContaining({ ids: "30000000-0000-0000-0000-000000000001" })
    );
  });

  it("should not log or revalidate when no video is updated", async () => {
    supabase.on("select", "videos", videos);
    supabase.on("update", "videos", (request: SupabaseRequest) =>
      request.query["visible"] === "eq.true"
        ? postgresError("XX000", "Database error")
        : updatedRows(request, {
            changedIds: ["30000000-0000-0000-0000-000000000001"],
          })
    );

    const result = await toggleVisibilityAction(ids);

    expect(result).toEqual({
      error: "動画の表示状態を更新できませんでした。",
      success: false,
    });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });

  it("should skip videos changed by another operation after reading", async () => {
    supabase.on("select", "videos", videos);
    supabase.on("update", "videos", (request: SupabaseRequest) =>
      updatedRows(request, {
        changedIds: ["30000000-0000-0000-0000-000000000002"],
      })
    );

    const result = await toggleVisibilityAction(ids);

    expect(result).toEqual({
      error: "2 件を更新し、1 件は失敗しました。",
      success: false,
    });
    test.expectAuditLogs([
      {
        action: "VIDEO_VISIBILITY_TOGGLE",
        details: { entityName: "Hidden Video" },
        targetRecordId: "30000000-0000-0000-0000-000000000001",
      },
      {
        action: "VIDEO_VISIBILITY_TOGGLE",
        details: { entityName: "Visible Video 2" },
        targetRecordId: "30000000-0000-0000-0000-000000000003",
      },
    ]);
  });
});

describe.each([
  ["restoreAction", restoreAction],
  ["softDeleteAction", softDeleteAction],
  ["toggleVisibilityAction", toggleVisibilityAction],
])("%s with invalid ids", (_, action) => {
  it.each([
    ["an empty list", []],
    ["an id that is not a UUID", ["video-1"]],
    [
      "more than 100 ids",
      Array.from(
        { length: 101 },
        (_, index) =>
          `30000000-0000-0000-0000-${String(index).padStart(12, "0")}`
      ),
    ],
    [
      "a duplicate id",
      [
        "30000000-0000-0000-0000-000000000001",
        "30000000-0000-0000-0000-000000000001",
      ],
    ],
    ["a value that is not a list", "30000000-0000-0000-0000-000000000001"],
  ])("should return error without updating anything for %s", async (_, ids) => {
    const result = await action(ids as string[]);

    expect(result).toEqual({ error: INVALID_INPUT_ERROR, success: false });
    expect(supabase.requests).toHaveLength(0);
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });
});
