import { describe, expect, it } from "vitest";

import { isNonNullable } from "./is-non-nullable";

describe(isNonNullable, () => {
  it("should return true for non-null and non-undefined values", () => {
    expect(isNonNullable("test")).toBeTruthy();
    expect(isNonNullable(0)).toBeTruthy();
    expect(isNonNullable(false)).toBeTruthy();
    expect(isNonNullable([])).toBeTruthy();
    expect(isNonNullable({})).toBeTruthy();
  });

  it("should return false for null", () => {
    expect(isNonNullable(null)).toBeFalsy();
  });

  it("should return false for undefined", () => {
    expect(isNonNullable(undefined)).toBeFalsy();
  });
});
