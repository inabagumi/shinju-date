import { describe, expect, it } from "vitest";

import { MAX_UUID_LIST_LENGTH, uuidListSchema, uuidSchema } from "./schemas";

describe("uuidSchema.safeParse", () => {
  it.each([
    // supabase/seed.sql のタレントの ID（バージョンとバリアントの桁が 0）
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-4000-8000-000000000001",
    "123e4567-e89b-12d3-a456-426614174000",
    "A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11",
  ])("accepts %s", (value) => {
    expect(uuidSchema.safeParse(value).success).toBeTruthy();
  });

  it.each([
    "",
    "invalid-uuid",
    "00000000-0000-0000-0000-00000000000",
    "00000000000000000000000000000001",
    "g0000000-0000-0000-0000-000000000001",
  ])("rejects %j", (value) => {
    expect(uuidSchema.safeParse(value).success).toBeFalsy();
  });
});

describe("uuidListSchema.safeParse", () => {
  /** `n` 件の、重複しない UUID */
  const uuids = (n: number): string[] =>
    Array.from(
      { length: n },
      (_, index) => `00000000-0000-0000-0000-${String(index).padStart(12, "0")}`
    );

  it.each([1, 2, MAX_UUID_LIST_LENGTH])("accepts %i ids", (n) => {
    expect(uuidListSchema.safeParse(uuids(n)).success).toBeTruthy();
  });

  it.each([
    ["an empty list", []],
    [`${MAX_UUID_LIST_LENGTH + 1} ids`, uuids(MAX_UUID_LIST_LENGTH + 1)],
    [
      "a list with an invalid id",
      ["00000000-0000-0000-0000-000000000001", "video-1"],
    ],
    [
      "a list with a duplicate id",
      [
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000001",
      ],
    ],
    [
      "a list with ids that differ only in case",
      [
        "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        "A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11",
      ],
    ],
    ["a string", "00000000-0000-0000-0000-000000000001"],
    ["null", null],
  ])("rejects %s", (_, value) => {
    expect(uuidListSchema.safeParse(value).success).toBeFalsy();
  });
});
