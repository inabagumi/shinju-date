import { CACHE_TAGS } from "@shinju-date/constants";
import { afterEach, describe, expect, it, vi } from "vitest";

import { setupActionTest } from "@/test/action-harness";
import { postgresError } from "@/test/supabase";

import { createAnnouncementAction, updateAnnouncementAction } from "./index";

const test = setupActionTest();
const { supabase } = test;

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、認証のモックより先に `@/lib/auth` が読み込まれるため、
 * ここに書く
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";

const ID = "90000000-0000-0000-0000-000000000001";
const MESSAGE = "メンテナンスのお知らせ";

const REVALIDATION = {
  paths: ["/announcements"],
  tags: [[CACHE_TAGS.ANNOUNCEMENTS]],
};

/** 画面の `handleAction` が送るのと同じ形の、お知らせのフォーム */
function announcementForm(entries: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries({
    end_at: "2026-01-08T00:00:00.000Z",
    message: MESSAGE,
    start_at: "2025-12-31T15:00:00.000Z",
    ...entries,
  })) {
    formData.set(key, value);
  }

  return formData;
}

/** 日時の項目は画面に入力欄がないため、エラーは `generic` になる */
const periodCases = [
  [
    "the end is before the start",
    { end_at: "2026-01-01T00:00:00Z", start_at: "2026-01-08T00:00:00Z" },
    "終了日時は開始日時より後に設定してください。",
  ],
  [
    "the start is in a wrong format",
    { start_at: "2026/01/01 00:00" },
    "日時の形式が正しくありません。",
  ],
  [
    "the end is in a wrong format",
    { end_at: "not a date" },
    "日時の形式が正しくありません。",
  ],
  [
    "the start is empty",
    { start_at: "" },
    "開始日時と終了日時を入力してください。",
  ],
  [
    "both dates are empty",
    { end_at: "", start_at: "" },
    "開始日時と終了日時を入力してください。",
  ],
] as const;

describe("announcement actions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createAnnouncementAction()", () => {
    it("adds the announcement with the period in the database format", async () => {
      supabase.on("insert", "announcements", { id: ID, message: MESSAGE });

      const result = await createAnnouncementAction(
        {},
        announcementForm({
          enabled: "true",
          level: "warning",
          message: `  ${MESSAGE}  `,
        })
      );

      expect(result).toStrictEqual({ success: true });
      expect(supabase.calls("insert", "announcements")).toMatchObject([
        {
          body: {
            enabled: true,
            end_at: "2026-01-08T00:00:00Z",
            level: "warning",
            message: MESSAGE,
            start_at: "2025-12-31T15:00:00Z",
          },
        },
      ]);
      test.expectAuditLog("ANNOUNCEMENT_CREATE", ID, { entityName: MESSAGE });
      test.expectRevalidated(REVALIDATION);
    });

    it("defaults the level to info and enabled to false", async () => {
      supabase.on("insert", "announcements", { id: ID, message: MESSAGE });

      await createAnnouncementAction({}, announcementForm({}));

      expect(supabase.calls("insert", "announcements")).toMatchObject([
        { body: { enabled: false, level: "info" } },
      ]);
    });

    it("returns an error for an unknown level without saving it", async () => {
      const result = await createAnnouncementAction(
        {},
        announcementForm({ level: "danger" })
      );

      expect(result).toStrictEqual({
        errors: { level: ["レベルを選択してください。"] },
      });
      expect(supabase.requests).toStrictEqual([]);
      test.expectNoAuditLog();
      test.expectNotRevalidated();
    });

    it.each([
      ["empty", "   "],
      ["missing", null],
    ])(
      "returns an error for the message when it is %s",
      async (_label, message) => {
        const formData = announcementForm({});

        if (message === null) {
          formData.delete("message");
        } else {
          formData.set("message", message);
        }

        const result = await createAnnouncementAction({}, formData);

        expect(result).toStrictEqual({
          errors: { message: ["お知らせメッセージを入力してください。"] },
        });
        expect(supabase.requests).toStrictEqual([]);
      }
    );

    it.each(periodCases)(
      "returns a generic error when %s",
      async (_label, entries, message) => {
        const result = await createAnnouncementAction(
          {},
          announcementForm(entries)
        );

        expect(result).toStrictEqual({ errors: { generic: [message] } });
        expect(supabase.requests).toStrictEqual([]);
        test.expectNotRevalidated();
      }
    );

    it("returns the fixed message when the insert fails", async () => {
      supabase.on(
        "insert",
        "announcements",
        postgresError("XX000", "Database error")
      );

      const result = await createAnnouncementAction({}, announcementForm({}));

      expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR });
      test.expectNoAuditLog();
      test.expectNotRevalidated();
    });
  });

  describe("updateAnnouncementAction()", () => {
    it("updates the announcement", async () => {
      supabase.on("update", "announcements", { message: MESSAGE });

      const result = await updateAnnouncementAction(
        {},
        announcementForm({ id: ID, level: "alert" })
      );

      expect(result).toStrictEqual({ success: true });
      expect(supabase.calls("update", "announcements")).toMatchObject([
        {
          body: {
            enabled: false,
            end_at: "2026-01-08T00:00:00Z",
            level: "alert",
            message: MESSAGE,
            start_at: "2025-12-31T15:00:00Z",
          },
          query: { id: `eq.${ID}` },
        },
      ]);
      // `updated_at` is left to the trigger of the table
      expect(
        supabase.calls("update", "announcements")[0]?.body
      ).not.toHaveProperty("updated_at");
      test.expectAuditLog("ANNOUNCEMENT_UPDATE", ID, { entityName: MESSAGE });
      test.expectRevalidated(REVALIDATION);
    });

    it("returns an error for an unknown level without saving it", async () => {
      const result = await updateAnnouncementAction(
        {},
        announcementForm({ id: ID, level: "danger" })
      );

      expect(result).toStrictEqual({
        errors: { level: ["レベルを選択してください。"] },
      });
      expect(supabase.requests).toStrictEqual([]);
    });

    it.each(periodCases)(
      "returns a generic error when %s",
      async (_label, entries, message) => {
        const result = await updateAnnouncementAction(
          {},
          announcementForm({ id: ID, ...entries })
        );

        expect(result).toStrictEqual({ errors: { generic: [message] } });
        expect(supabase.requests).toStrictEqual([]);
      }
    );

    it("returns a generic error without the ID", async () => {
      const result = await updateAnnouncementAction({}, announcementForm({}));

      expect(result).toStrictEqual({
        errors: { generic: ["IDが指定されていません。"] },
      });
      expect(supabase.requests).toStrictEqual([]);
    });

    it("returns the fixed message when the update fails", async () => {
      supabase.on(
        "update",
        "announcements",
        postgresError("XX000", "Database error")
      );

      const result = await updateAnnouncementAction(
        {},
        announcementForm({ id: ID })
      );

      expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR });
      test.expectNoAuditLog();
      test.expectNotRevalidated();
    });
  });
});
