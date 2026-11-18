import { describe, expect, it } from "vitest";

import { termSchema, updateTermSchema } from "./schema";

const ID = "80000000-0000-0000-0000-000000000001";

describe("termSchema", () => {
  it("trims the term, readings and synonyms", () => {
    expect(
      termSchema.parse({
        readings: [" はいしん　"],
        synonyms: ["  生放送 ", "ライブ"],
        term: "  配信  ",
      })
    ).toEqual({
      readings: ["はいしん"],
      synonyms: ["生放送", "ライブ"],
      term: "配信",
    });
  });

  it("drops the empty readings and synonyms", () => {
    expect(
      termSchema.parse({
        readings: ["", "はいしん", "   "],
        synonyms: ["　", ""],
        term: "配信",
      })
    ).toEqual({ readings: ["はいしん"], synonyms: [], term: "配信" });
  });

  it("defaults the readings and synonyms to empty arrays", () => {
    expect(termSchema.parse({ term: "配信" })).toEqual({
      readings: [],
      synonyms: [],
      term: "配信",
    });
  });

  it.each([[""], ["   "], [undefined]])("requires the term for %j", (term) => {
    const result = termSchema.safeParse({ term });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map(({ message, path }) => [path.join("."), message])
    ).toEqual([["term", "用語を入力してください。"]]);
  });
});

describe("updateTermSchema", () => {
  it("accepts a UUID as the ID", () => {
    expect(updateTermSchema.parse({ id: ID, term: "配信" })).toEqual({
      id: ID,
      readings: [],
      synonyms: [],
      term: "配信",
    });
  });

  it.each([[""], ["not-a-uuid"], [undefined]])("rejects %j as the ID", (id) => {
    const result = updateTermSchema.safeParse({ id, term: "配信" });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map(({ message, path }) => [path.join("."), message])
    ).toEqual([["id", "有効なIDではありません。"]]);
  });
});
