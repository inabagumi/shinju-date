import { CACHE_TAGS } from "@shinju-date/constants";
import { describe, expect, it } from "vitest";

import { setupActionTest } from "@/test/action-harness";
import { postgresError } from "@/test/supabase";

import { createTermAction, deleteTermAction, updateTermAction } from "./index";

const test = setupActionTest();
const { supabase } = test;

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、認証のモックより先に `@/lib/auth` が読み込まれるため、
 * ここに書く
 */
const ACTION_FAILED_ERROR =
  "処理に失敗しました。時間をおいて、もう一度お試しください。";

const ID = "80000000-0000-0000-0000-000000000001";

const termForm = (
  entries: Record<string, string>,
  { readings = [], synonyms = [] }: { readings?: string[]; synonyms?: string[] }
): FormData => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  readings.forEach((reading, index) => {
    formData.set(`readings[${index}]`, reading);
  });
  synonyms.forEach((synonym, index) => {
    formData.set(`synonyms[${index}]`, synonym);
  });

  return formData;
};

describe("createTermAction()", () => {
  it("adds the term with the trimmed, non-empty readings and synonyms", async () => {
    supabase.on("insert", "terms", { id: ID, term: "配信" });

    const result = await createTermAction(
      {},
      termForm(
        { term: "  配信  " },
        {
          readings: [" はいしん ", "", "   "],
          synonyms: ["", " 生放送 ", "ライブ"],
        }
      )
    );

    expect(result).toStrictEqual({ success: true });
    expect(supabase.calls("insert", "terms")).toMatchObject([
      {
        body: {
          readings: ["はいしん"],
          synonyms: ["生放送", "ライブ"],
          term: "配信",
        },
      },
    ]);
    test.expectAuditLog("TERM_CREATE", ID, { entityName: "配信" });
    test.expectRevalidated({
      paths: ["/terms"],
      tags: [[CACHE_TAGS.VIDEOS]],
    });
  });

  it("keeps the readings in the order of their indexes", async () => {
    supabase.on("insert", "terms", { id: ID, term: "Term" });

    const formData = new FormData();
    formData.set("term", "Term");
    formData.set("readings[1]", "second");
    formData.set("readings[0]", "first");

    await createTermAction({}, formData);

    expect(supabase.calls("insert", "terms")).toMatchObject([
      { body: { readings: ["first", "second"], synonyms: [] } },
    ]);
  });

  it.each([
    ["empty", "   "],
    ["missing", null],
  ])("returns an error for the term when it is %s", async (_label, term) => {
    const result = await createTermAction(
      {},
      termForm(term === null ? {} : { term }, {})
    );

    expect(result).toStrictEqual({
      errors: { term: ["用語を入力してください。"] },
    });
    expect(supabase.requests).toStrictEqual([]);
    test.expectNotRevalidated();
  });

  it("returns the fixed message when the insert fails", async () => {
    supabase.on("insert", "terms", postgresError("XX000", "Database error"));

    const result = await createTermAction({}, termForm({ term: "Term" }, {}));

    expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });
});

describe("updateTermAction()", () => {
  it("updates the term", async () => {
    supabase.on("update", "terms", { term: "配信" });

    const result = await updateTermAction(
      {},
      termForm(
        { id: ID, term: " 配信 " },
        { readings: ["はいしん"], synonyms: [""] }
      )
    );

    expect(result).toStrictEqual({ success: true });
    expect(supabase.calls("update", "terms")).toMatchObject([
      {
        body: {
          readings: ["はいしん"],
          synonyms: [],
          term: "配信",
        },
        query: { id: `eq.${ID}` },
      },
    ]);
    // `updated_at` is left to the trigger of the table
    expect(supabase.calls("update", "terms")[0]?.body).not.toHaveProperty(
      "updated_at"
    );
    test.expectAuditLog("TERM_UPDATE", ID, { entityName: "配信" });
    test.expectRevalidated({
      paths: ["/terms"],
      tags: [[CACHE_TAGS.VIDEOS]],
    });
  });

  it.each([
    ["missing", {}],
    ["not a UUID", { id: "not-a-uuid" }],
  ])("returns a generic error when the ID is %s", async (_label, entries) => {
    const result = await updateTermAction(
      {},
      termForm({ ...entries, term: "Term" }, {})
    );

    expect(result).toStrictEqual({
      errors: { generic: ["有効なIDではありません。"] },
    });
    expect(supabase.requests).toStrictEqual([]);
  });

  it("returns the fixed message when the update fails", async () => {
    supabase.on("update", "terms", postgresError("XX000", "Database error"));

    const result = await updateTermAction(
      {},
      termForm({ id: ID, term: "Term" }, {})
    );

    expect(result).toStrictEqual({ error: ACTION_FAILED_ERROR });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });
});

describe("deleteTermAction()", () => {
  it("deletes the term", async () => {
    supabase.on("delete", "terms", { term: "配信" });

    const result = await deleteTermAction(ID);

    expect(result).toStrictEqual({ success: true });
    expect(supabase.calls("delete", "terms")).toMatchObject([
      { query: { id: `eq.${ID}` } },
    ]);
    test.expectAuditLog("TERM_DELETE", ID, { entityName: "配信" });
    test.expectRevalidated({
      paths: ["/terms"],
      tags: [[CACHE_TAGS.VIDEOS]],
    });
  });

  it("returns an error without the ID", async () => {
    const result = await deleteTermAction("");

    expect(result).toStrictEqual({
      error: "IDが指定されていません。",
      success: false,
    });
    expect(supabase.requests).toStrictEqual([]);
  });

  it("returns the fixed message when the delete fails", async () => {
    supabase.on("delete", "terms", postgresError("XX000", "Database error"));

    const result = await deleteTermAction(ID);

    expect(result).toStrictEqual({
      error: ACTION_FAILED_ERROR,
      success: false,
    });
    test.expectNoAuditLog();
    test.expectNotRevalidated();
  });
});
