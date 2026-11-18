import { describe, expect, test } from "vitest";

import type { Talent } from "@/lib/data/talents";

import { findMatchingTalents } from "./talent-match";

const TALENTS: Talent[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "朝霧ミオ" },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Ｙｕｒａ Ｎａｇｉｓａｗａ",
  },
  { id: "00000000-0000-4000-8000-000000000003", name: "ｶﾀｶﾅ太郎" },
  { id: "00000000-0000-4000-8000-000000000004", name: "ミオソティス" },
];

describe("findMatchingTalents", () => {
  test("should return the talents whose name contains the query", () => {
    expect(findMatchingTalents(TALENTS, "ミオ")).toEqual([
      TALENTS[0],
      TALENTS[3],
    ]);
    expect(findMatchingTalents(TALENTS, "朝霧")).toEqual([TALENTS[0]]);
  });

  test("should ignore the difference between full-width and half-width characters", () => {
    expect(findMatchingTalents(TALENTS, "yura")).toEqual([TALENTS[1]]);
    expect(findMatchingTalents(TALENTS, "カタカナ")).toEqual([TALENTS[2]]);
    expect(findMatchingTalents(TALENTS, "ｶﾀｶﾅ")).toEqual([TALENTS[2]]);
  });

  test("should ignore the difference between upper and lower case", () => {
    expect(findMatchingTalents(TALENTS, "NAGISAWA")).toEqual([TALENTS[1]]);
    expect(findMatchingTalents(TALENTS, "ｎａｇｉ")).toEqual([TALENTS[1]]);
  });

  test("should return nothing for an empty query", () => {
    expect(findMatchingTalents(TALENTS, "")).toEqual([]);
    expect(findMatchingTalents(TALENTS, "　 ")).toEqual([]);
  });

  test("should not return the excluded talents", () => {
    expect(
      findMatchingTalents(TALENTS, "ミオ", [TALENTS[0]?.id ?? ""])
    ).toEqual([TALENTS[3]]);
  });
});
