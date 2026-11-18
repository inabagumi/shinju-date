import { describe, expect, it } from "vitest";

import {
  hasInvalidTalentId,
  normalizeTalentIds,
  parseTalentIds,
} from "./talent-filter";

const TALENT_A = "0f6b7c84-1a1e-4b4e-9d3a-5c7a0c1e2f01";
const TALENT_B = "7d2e4b1a-3c5f-4e6a-8b9c-0d1e2f3a4b02";
const TALENT_C = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c03";
const ACTIVE_TALENT_IDS = [TALENT_C, TALENT_A, TALENT_B];

describe("normalizeTalentIds", () => {
  it("should remove duplicates and sort the IDs", () => {
    expect(normalizeTalentIds([TALENT_C, TALENT_A, TALENT_C])).toEqual([
      TALENT_A,
      TALENT_C,
    ]);
  });
});

describe("hasInvalidTalentId", () => {
  it("should accept missing values and UUIDs", () => {
    expect(hasInvalidTalentId(undefined)).toBe(false);
    expect(hasInvalidTalentId([])).toBe(false);
    expect(hasInvalidTalentId([TALENT_A, TALENT_B.toUpperCase()])).toBe(false);
  });

  it("should find the values that are not UUIDs", () => {
    expect(hasInvalidTalentId("abc")).toBe(true);
    expect(hasInvalidTalentId([""])).toBe(true);
    expect(hasInvalidTalentId([TALENT_A, `${TALENT_B}x`])).toBe(true);
  });
});

describe("parseTalentIds", () => {
  it("should return the given talents", () => {
    expect(parseTalentIds(TALENT_A, ACTIVE_TALENT_IDS)).toEqual([TALENT_A]);
    expect(
      parseTalentIds([TALENT_C, TALENT_A, TALENT_C], ACTIVE_TALENT_IDS)
    ).toEqual([TALENT_A, TALENT_C]);
  });

  it("should accept the IDs in upper case", () => {
    expect(parseTalentIds(TALENT_B.toUpperCase(), ACTIVE_TALENT_IDS)).toEqual([
      TALENT_B,
    ]);
  });

  it("should ignore the values that are not UUIDs", () => {
    expect(parseTalentIds(undefined, ACTIVE_TALENT_IDS)).toEqual([]);
    expect(parseTalentIds("", ACTIVE_TALENT_IDS)).toEqual([]);
    expect(
      parseTalentIds(["abc", `${TALENT_A}x`, TALENT_B], ACTIVE_TALENT_IDS)
    ).toEqual([TALENT_B]);
  });

  it("should ignore the IDs of talents that are not active", () => {
    expect(
      parseTalentIds(
        ["00000000-0000-4000-8000-000000000000", TALENT_A],
        ACTIVE_TALENT_IDS
      )
    ).toEqual([TALENT_A]);
  });

  it("should keep every UUID without the active talents", () => {
    expect(
      parseTalentIds([TALENT_C, "abc", "00000000-0000-4000-8000-000000000000"])
    ).toEqual(["00000000-0000-4000-8000-000000000000", TALENT_C]);
  });
});
