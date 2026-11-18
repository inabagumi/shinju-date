import { range } from "@shinju-date/helpers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOTAL_DISPLAY_COUNT } from "./constants";
import { getCombinedRecommendationQueries } from "./get-combined-queries";
import { getDisplayRecommendationQueries } from "./get-display-queries";

vi.mock(import("./get-combined-queries"), () => ({
  getCombinedRecommendationQueries:
    vi.fn<typeof getCombinedRecommendationQueries>(),
}));

function createQueries(count: number): string[] {
  return range(1, count + 1).map((i) => `query${i}`);
}

function getRank(query: string): number {
  return Number.parseInt(query.replace("query", ""), 10);
}

describe(getDisplayRecommendationQueries, () => {
  beforeEach(() => {
    vi.mocked(getCombinedRecommendationQueries).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("displays 4 queries", () => {
    expect(TOTAL_DISPLAY_COUNT).toBe(4);
  });

  it("should return empty array when no queries are available", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue([]);

    const result = await getDisplayRecommendationQueries();

    expect(result).toStrictEqual([]);
  });

  it("should return all queries when there are 4 or fewer", async () => {
    const mockQueries = ["query1", "query2", "query3"];
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(mockQueries);

    const result = await getDisplayRecommendationQueries();

    expect(result).toStrictEqual(mockQueries);
  });

  it("should return exactly 4 queries when there are 4 available", async () => {
    const mockQueries = createQueries(4);
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(mockQueries);

    const result = await getDisplayRecommendationQueries();

    expect(result).toStrictEqual(mockQueries);
  });

  it("should include top 2 champion queries when there are many queries", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(25)
    );

    const result = await getDisplayRecommendationQueries();

    expect(result[0]).toBe("query1");
    expect(result[1]).toBe("query2");
    expect(result).toHaveLength(TOTAL_DISPLAY_COUNT);
  });

  it("should not include queries beyond position 20 in random selection", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(30)
    );

    const results = await Promise.all(
      range(50).map(() => getDisplayRecommendationQueries())
    );

    for (const result of results) {
      expect(result).toHaveLength(TOTAL_DISPLAY_COUNT);
      expect(result[0]).toBe("query1");
      expect(result[1]).toBe("query2");

      for (const query of result.slice(2)) {
        expect(getRank(query)).toBeGreaterThanOrEqual(3);
        expect(getRank(query)).toBeLessThanOrEqual(20);
      }
    }
  });

  it("can pick the 3rd and the 20th queries", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(30)
    );

    // random() close to 1 leaves the pool (3rd to 20th) in order
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    await expect(getDisplayRecommendationQueries()).resolves.toStrictEqual([
      "query1",
      "query2",
      "query3",
      "query4",
    ]);

    // The first swap exchanges the last item of the pool (20th) with the
    // first (3rd), and the rest leave the pool as is
    vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValue(0.999999);
    await expect(getDisplayRecommendationQueries()).resolves.toStrictEqual([
      "query1",
      "query2",
      "query20",
      "query4",
    ]);
  });

  it("reads the combined queries and picks again on every call", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(25)
    );

    const results = await Promise.all(
      range(20).map(() => getDisplayRecommendationQueries())
    );

    expect(getCombinedRecommendationQueries).toHaveBeenCalledTimes(20);

    for (const result of results) {
      expect(result[0]).toBe("query1");
      expect(result[1]).toBe("query2");
    }

    // With 20 calls and 18 possible queries (3-20), the picks should vary
    const randomParts = new Set(results.map((r) => r.slice(2).join(",")));
    expect(randomParts.size).toBeGreaterThan(1);
  });

  it("should handle case with exactly 5 queries", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(5)
    );

    const result = await getDisplayRecommendationQueries();

    expect(result).toHaveLength(TOTAL_DISPLAY_COUNT);
    expect(result[0]).toBe("query1");
    expect(result[1]).toBe("query2");
    for (const query of result.slice(2)) {
      expect(["query3", "query4", "query5"]).toContain(query);
    }
  });

  it("should not contain duplicate queries", async () => {
    vi.mocked(getCombinedRecommendationQueries).mockResolvedValue(
      createQueries(25)
    );

    const results = await Promise.all(
      range(10).map(() => getDisplayRecommendationQueries())
    );

    for (const result of results) {
      expect(new Set(result).size).toBe(result.length);
    }
  });
});
