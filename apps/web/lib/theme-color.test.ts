import { describe, expect, it } from "vitest";

import { parseThemeColor } from "./theme-color";

describe("parseThemeColor", () => {
  it("should accept #RRGGBB in either case", () => {
    expect(parseThemeColor("#ff6b9d")).toBe("#ff6b9d");
    expect(parseThemeColor("#FF6B9D")).toBe("#ff6b9d");
  });

  it.each([null, undefined, ""])("should treat %j as not set", (value) => {
    expect(parseThemeColor(value)).toBeNull();
  });

  it.each([
    "ff6b9d",
    "#fff",
    "#ff6b9d80",
    "#gg6b9d",
    "red",
    "rgb(255, 107, 157)",
    "var(--color-live)",
    "#ff6b9d; color: red",
    " #ff6b9d",
  ])("should treat %j as not set", (value) => {
    expect(parseThemeColor(value)).toBeNull();
  });
});
