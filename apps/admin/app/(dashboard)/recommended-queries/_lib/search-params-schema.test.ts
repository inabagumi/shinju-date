import { describe, expect, it } from "vitest";

import { recommendedQueriesSearchParamsSchema } from "./search-params-schema";

describe("recommendedQueriesSearchParamsSchema", () => {
  it("has no search when no parameters are given", () => {
    expect(recommendedQueriesSearchParamsSchema.parse({})).toEqual({
      search: undefined,
    });
  });

  it("parses the search", () => {
    expect(
      recommendedQueriesSearchParamsSchema.parse({ search: " 歌枠 " })
    ).toEqual({
      search: "歌枠",
    });
  });

  it("has no search for a blank search", () => {
    expect(
      recommendedQueriesSearchParamsSchema.parse({ search: "  " })
    ).toEqual({
      search: undefined,
    });
  });

  it("uses the first value when the search is repeated", () => {
    expect(
      recommendedQueriesSearchParamsSchema.parse({ search: ["a", "b"] })
    ).toEqual({
      search: "a",
    });
  });
});
