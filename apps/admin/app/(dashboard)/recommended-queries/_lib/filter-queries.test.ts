import { describe, expect, it } from "vitest";

import { filterQueries } from "./filter-queries";

const identity = (query: string) => query;

describe("filterQueries", () => {
  it("returns every query without a search", () => {
    expect(filterQueries(["歌枠", "ASMR"], undefined, identity)).toEqual([
      "歌枠",
      "ASMR",
    ]);
  });

  it("keeps the queries that contain the search, ignoring the case", () => {
    expect(
      filterQueries(["歌枠", "ASMR", "asmr 雑談"], "Asmr", identity)
    ).toEqual(["ASMR", "asmr 雑談"]);
    expect(filterQueries(["歌枠"], "none", identity)).toEqual([]);
  });

  it("reads the query of each item", () => {
    const items = [
      { query: "歌枠", score: 1 },
      { query: "雑談", score: 2 },
    ];

    expect(filterQueries(items, "雑", (item) => item.query)).toEqual([
      { query: "雑談", score: 2 },
    ]);
  });
});
