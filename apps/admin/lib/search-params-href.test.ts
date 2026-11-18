import { describe, expect, it } from "vitest";

import { toURLSearchParams } from "./search-params-href";

describe(toURLSearchParams, () => {
  it("converts the page parameters to URLSearchParams", () => {
    expect(
      toURLSearchParams({
        page: "2",
        search: undefined,
        status: ["LIVE", "ENDED"],
      }).toString()
    ).toBe("page=2&status=LIVE&status=ENDED");
  });

  it("returns empty parameters for an empty query", () => {
    expect(toURLSearchParams({}).toString()).toBe("");
  });
});
