import { REDIS_KEYS } from "@shinju-date/constants";
import { DatabaseError } from "@shinju-date/scraper";
import type { Redis } from "@upstash/redis";
import { describe, expect, it, vi } from "vitest";

import type { TypedSupabaseClient } from "@/lib/supabase";

import {
  UPDATE_BATCH_SIZE,
  updateTermPopularity,
} from "./update-term-popularity";

const { createLoggerMock } = await vi.hoisted(() => import("@/test/mocks"));

// Mock logger
vi.mock(import("@shinju-date/logger"), () => ({
  logger: createLoggerMock(),
}));

interface RpcItem {
  score: number;
  term: string;
}

/** `rpc` of Supabase, as `update_terms_popularity` is called. */
type Rpc = (
  name: string,
  args: { p_items: RpcItem[] }
) => Promise<{ data: number | null; error: { message: string } | null }>;

function createMockRedis(results: (string | number)[]) {
  return {
    zrange: vi.fn<Redis["zrange"]>().mockResolvedValue(results),
  };
}

/**
 * A Supabase client whose `update_terms_popularity` matches the given terms
 * ignoring the case, like the Postgres function.
 */
function createMockSupabase(existingTerms: string[]) {
  const known = new Set(existingTerms.map((term) => term.toLowerCase()));
  const rpc = vi.fn<Rpc>(
    async (_name: string, { p_items }: { p_items: RpcItem[] }) => ({
      data: p_items.filter(({ term }) => known.has(term.toLowerCase())).length,
      error: null,
    })
  );
  const from = vi.fn<TypedSupabaseClient["from"]>();

  return { from, rpc };
}

async function run(
  redis: ReturnType<typeof createMockRedis>,
  supabase: { from: unknown; rpc: unknown }
) {
  return updateTermPopularity(
    // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Redis client
    redis as any,
    // oxlint-disable-next-line typescript/no-explicit-any -- Mocked Supabase client
    supabase as any
  );
}

describe(updateTermPopularity, () => {
  it("should fetch and update term popularity", async () => {
    const mockRedis = createMockRedis([
      "タレント名1",
      10,
      "タレント名2",
      5,
      "配信",
      3,
    ]);
    const mockSupabase = createMockSupabase([
      "タレント名1",
      "タレント名2",
      "配信",
    ]);

    const result = await run(mockRedis, mockSupabase);

    expect(mockRedis.zrange).toHaveBeenCalledWith(
      REDIS_KEYS.SEARCH_POPULAR_ALL_TIME,
      0,
      -1,
      {
        withScores: true,
      }
    );

    expect(result).toStrictEqual({ notFound: 0, total: 3, updated: 3 });

    expect(mockSupabase.rpc).toHaveBeenCalledExactlyOnceWith(
      "update_terms_popularity",
      {
        p_items: [
          { score: 10, term: "タレント名1" },
          { score: 5, term: "タレント名2" },
          { score: 3, term: "配信" },
        ],
      }
    );
  });

  it("should write only the popularity, without reading or writing whole rows", async () => {
    const mockRedis = createMockRedis(["asmr", 4]);
    const mockSupabase = createMockSupabase(["ASMR"]);

    const result = await run(mockRedis, mockSupabase);

    expect(result.updated).toBe(1);
    // Rows are neither read nor upserted, so the readings and synonyms edited
    // in the admin app in the meantime are kept.
    expect(mockSupabase.from).not.toHaveBeenCalled();

    expect(mockSupabase.rpc).toHaveBeenCalledWith("update_terms_popularity", {
      p_items: [{ score: 4, term: "asmr" }],
    });
  });

  it("should update every term when there are more than 1,000", async () => {
    const count = 1202;
    const terms = Array.from({ length: count }, (_, i) => `term-${i}`);
    const mockRedis = createMockRedis(terms.flatMap((term, i) => [term, i]));
    const mockSupabase = createMockSupabase(terms);

    const result = await run(mockRedis, mockSupabase);

    expect(result).toStrictEqual({ notFound: 0, total: count, updated: count });
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(
      Math.ceil(count / UPDATE_BATCH_SIZE)
    );

    const sentItems = mockSupabase.rpc.mock.calls.flatMap(
      ([, { p_items }]) => p_items
    );
    expect(sentItems).toHaveLength(count);
    expect(sentItems.at(-1)).toStrictEqual({
      score: count - 1,
      term: `term-${count - 1}`,
    });

    for (const [, { p_items }] of mockSupabase.rpc.mock.calls) {
      expect(p_items.length).toBeLessThanOrEqual(UPDATE_BATCH_SIZE);
    }
  });

  it("should handle empty Redis data", async () => {
    const mockRedis = createMockRedis([]);
    const mockSupabase = createMockSupabase([]);

    const result = await run(mockRedis, mockSupabase);

    expect(result).toStrictEqual({ notFound: 0, total: 0, updated: 0 });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it("should handle terms not found in database", async () => {
    const mockRedis = createMockRedis(["unknown-term", 10, "another-term", 5]);
    const mockSupabase = createMockSupabase([]);

    const result = await run(mockRedis, mockSupabase);

    expect(result).toStrictEqual({ notFound: 2, total: 2, updated: 0 });
  });

  it("should count the terms that are not found", async () => {
    const mockRedis = createMockRedis(["配信", 10, "unknown-term", 5]);
    const mockSupabase = createMockSupabase(["配信"]);

    const result = await run(mockRedis, mockSupabase);

    expect(result).toStrictEqual({ notFound: 1, total: 2, updated: 1 });
  });

  it("should handle database errors gracefully", async () => {
    const mockRedis = createMockRedis(["term1", 10]);
    const mockSupabase = {
      from: vi.fn<TypedSupabaseClient["from"]>(),
      rpc: vi.fn<Rpc>().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      }),
    };

    const result = run(mockRedis, mockSupabase);

    await expect(result).rejects.toBeInstanceOf(DatabaseError);
    await expect(result).rejects.toMatchObject({
      cause: { message: "Database error" },
      operation: "Failed to update the popularity of terms",
    });
  });

  it("should convert scores to integers", async () => {
    const mockRedis = createMockRedis(["term1", 10.7, "term2", 5.3]);
    const mockSupabase = createMockSupabase(["term1", "term2"]);

    await run(mockRedis, mockSupabase);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("update_terms_popularity", {
      p_items: [
        { score: 10, term: "term1" },
        { score: 5, term: "term2" },
      ],
    });
  });
});
