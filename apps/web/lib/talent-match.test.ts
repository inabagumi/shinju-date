import { describe, expect, it } from "vitest";

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

describe(findMatchingTalents, () => {
  it("should return the talents whose name contains the query", () => {
    expect(findMatchingTalents(TALENTS, "ミオ")).toStrictEqual([
      TALENTS[0],
      TALENTS[3],
    ]);
    expect(findMatchingTalents(TALENTS, "朝霧")).toStrictEqual([TALENTS[0]]);
  });

  it("should ignore the difference between full-width and half-width characters", () => {
    expect(findMatchingTalents(TALENTS, "yura")).toStrictEqual([TALENTS[1]]);
    expect(findMatchingTalents(TALENTS, "カタカナ")).toStrictEqual([
      TALENTS[2],
    ]);
    expect(findMatchingTalents(TALENTS, "ｶﾀｶﾅ")).toStrictEqual([TALENTS[2]]);
  });

  it("should ignore the difference between upper and lower case", () => {
    expect(findMatchingTalents(TALENTS, "NAGISAWA")).toStrictEqual([
      TALENTS[1],
    ]);
    expect(findMatchingTalents(TALENTS, "ｎａｇｉ")).toStrictEqual([
      TALENTS[1],
    ]);
  });

  it("should return nothing for an empty query", () => {
    expect(findMatchingTalents(TALENTS, "")).toStrictEqual([]);
    expect(findMatchingTalents(TALENTS, "　 ")).toStrictEqual([]);
  });

  it("should not return the excluded talents", () => {
    expect(
      findMatchingTalents(TALENTS, "ミオ", [TALENTS[0]?.id ?? ""])
    ).toStrictEqual([TALENTS[3]]);
  });
});
