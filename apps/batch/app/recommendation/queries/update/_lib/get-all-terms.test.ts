import { DatabaseError } from "@shinju-date/scraper";
import { describe, expect, it, vi } from "vitest";

import { getAllTerms } from "./get-all-terms";

interface Row {
  id: string;
  synonyms: string[];
  term: string;
}

/**
 * A Supabase client whose `terms` table returns the rows after `gt('id', ...)`
 * in ascending order of `id`, up to `limit(...)` (and at most `maxRows`, like
 * PostgREST).
 */
function createMockSupabase(rows: Row[], { maxRows = 1_000 } = {}) {
  const sorted = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
  const requests: { cursor: string | undefined; limit: number }[] = [];

  const from = vi.fn(() => {
    let cursor: string | undefined;
    let limit = Number.POSITIVE_INFINITY;

    const builder = {
      gt(_column: string, value: string) {
        cursor = value;
        return builder;
      },
      limit(value: number) {
        limit = value;
        return builder;
      },
      order() {
        return builder;
      },
      select() {
        return builder;
      },
      // oxlint-disable-next-line unicorn/no-thenable -- Mimics the awaitable query builder of Supabase
      then<T>(resolve: (value: { data: Row[]; error: null }) => T) {
        requests.push({ cursor, limit });
        const data = sorted
          .filter(({ id }) => cursor === undefined || id > cursor)
          .slice(0, Math.min(limit, maxRows));

        return Promise.resolve(resolve({ data, error: null }));
      },
    };

    return builder;
  });

  return { client: { from }, requests };
}

function createRows(count: number): Row[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`,
    synonyms: [`synonym-${i}`],
    term: `term-${i}`,
  }));
}

describe("getAllTerms", () => {
  it("should read every term when there are more than 1,000", async () => {
    const rows = createRows(1_202);
    const { client, requests } = createMockSupabase(rows);

    // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
    const terms = await Array.fromAsync(getAllTerms(client as any));

    expect(terms).toHaveLength(1_202);
    expect(new Set(terms.map(({ id }) => id)).size).toBe(1_202);
    expect(requests.map(({ cursor }) => cursor)).toEqual([
      undefined,
      rows[999]?.id,
      rows[1_201]?.id,
    ]);
  });

  it("should read every term when a page is cut short by max_rows", async () => {
    const rows = createRows(25);
    const { client } = createMockSupabase(rows, { maxRows: 10 });

    const terms = await Array.fromAsync(
      // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
      getAllTerms(client as any, { pageSize: 20 })
    );

    expect(terms.map(({ term }) => term)).toEqual(rows.map(({ term }) => term));
  });

  it("should return no terms when there are none", async () => {
    const { client } = createMockSupabase([]);

    // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
    expect(await Array.fromAsync(getAllTerms(client as any))).toEqual([]);
  });

  it("should throw when a page does not move past the previous one", async () => {
    const rows = createRows(2);
    const builder = {
      gt: () => builder,
      limit: () => builder,
      order: () => builder,
      select: () => builder,
      // oxlint-disable-next-line unicorn/no-thenable -- Mimics the awaitable query builder of Supabase
      then: <T>(resolve: (value: { data: Row[]; error: null }) => T) =>
        Promise.resolve(resolve({ data: rows, error: null })),
    };
    const client = { from: () => builder };

    await expect(
      // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
      Array.fromAsync(getAllTerms(client as any))
    ).rejects.toThrow("Pagination did not advance");
  });

  it("should throw when the query fails", async () => {
    const error = { message: "Database error" };
    const builder = {
      limit: () => builder,
      order: () => builder,
      select: () => builder,
      // oxlint-disable-next-line unicorn/no-thenable -- Mimics the awaitable query builder of Supabase
      then: <T>(resolve: (value: { data: null; error: typeof error }) => T) =>
        Promise.resolve(resolve({ data: null, error })),
    };
    const client = { from: () => builder };

    // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
    const result = Array.fromAsync(getAllTerms(client as any));

    await expect(result).rejects.toBeInstanceOf(DatabaseError);
    await expect(result).rejects.toMatchObject({
      cause: error,
      operation: "Failed to load terms",
    });
  });
});
