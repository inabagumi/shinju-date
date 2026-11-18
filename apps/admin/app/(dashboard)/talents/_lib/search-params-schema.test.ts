import { describe, expect, it } from "vitest";

import { talentSearchParamsSchema } from "./search-params-schema";

describe("talentSearchParamsSchema.parse", () => {
  it("uses the default values when no parameters are given", () => {
    expect(talentSearchParamsSchema.parse({})).toStrictEqual({
      sort: "desc",
      status: "not_deleted",
    });
  });

  it("parses valid parameters", () => {
    expect(
      talentSearchParamsSchema.parse({
        search: "ななし",
        sort: "asc",
        status: "retired",
      })
    ).toStrictEqual({ search: "ななし", sort: "asc", status: "retired" });
  });

  it("uses the default values for invalid values", () => {
    expect(
      talentSearchParamsSchema.parse({ sort: "random", status: "unknown" })
    ).toStrictEqual({ sort: "desc", status: "not_deleted" });
  });

  it("treats a blank search as no search and trims the search", () => {
    expect(
      talentSearchParamsSchema.parse({ search: "   " }).search
    ).toBeUndefined();
    expect(talentSearchParamsSchema.parse({ search: " abc " }).search).toBe(
      "abc"
    );
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(
      talentSearchParamsSchema.parse({
        search: ["a", "b"],
        sort: ["asc", "desc"],
        status: ["deleted", "all"],
      })
    ).toStrictEqual({ search: "a", sort: "asc", status: "deleted" });
  });
});
