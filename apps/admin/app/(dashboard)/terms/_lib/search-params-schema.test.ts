import { describe, expect, it } from "vitest";

import { termsSearchParamsSchema } from "./search-params-schema";

describe("termsSearchParamsSchema.parse", () => {
  it("has no search when no parameters are given", () => {
    expect(termsSearchParamsSchema.parse({})).toStrictEqual({});
  });

  it("parses the search", () => {
    expect(termsSearchParamsSchema.parse({ search: " ななし " })).toStrictEqual(
      {
        search: "ななし",
      }
    );
  });

  it("has no search for a blank search", () => {
    expect(termsSearchParamsSchema.parse({ search: "  " })).toStrictEqual({
      search: undefined,
    });
  });

  it("uses the first value when the search is repeated", () => {
    expect(termsSearchParamsSchema.parse({ search: ["a", "b"] })).toStrictEqual(
      {
        search: "a",
      }
    );
  });
});
