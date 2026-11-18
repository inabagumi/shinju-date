import type { default as Database } from "@shinju-date/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Redis } from "@upstash/redis";

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;

// Compares values the way PostgreSQL compares these columns: the timestamps
// are ISO 8601 strings in UTC, so the string order is the time order
const compare = (
  value: unknown,
  operator: string,
  operand: string
): boolean => {
  if (operator === "is" && operand === "null") return value === null;
  if (typeof value !== "string") return false;
  if (operator === "gte") return value >= operand;
  if (operator === "lt") return value < operand;
  throw new Error(`Unsupported operator: ${operator}`);
};

export interface FakeSupabaseOptions {
  /** Tables whose count fails with this error message. */
  errors?: Record<string, string>;
}

/**
 * A Supabase client that counts the rows of in-memory tables with the filters
 * of the query, so that the tests check the counts themselves.
 */
export const createFakeSupabaseClient = (
  tables: Record<string, readonly object[]>,
  { errors = {} }: FakeSupabaseOptions = {}
): SupabaseClient<Database> =>
  ({
    from(table: string) {
      const filters: Filter[] = [];
      const builder = {
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return builder;
        },
        in(column: string, values: readonly unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return builder;
        },
        is(column: string, value: null) {
          filters.push((row) => row[column] === value);
          return builder;
        },
        lt(column: string, value: string) {
          filters.push((row) => compare(row[column], "lt", value));
          return builder;
        },
        not(column: string, operator: string, value: unknown) {
          if (operator !== "is" || value !== null) {
            throw new Error(`Unsupported not(): ${operator}`);
          }
          filters.push((row) => row[column] !== null);
          return builder;
        },
        or(expression: string) {
          const conditions = expression.split(",").map((condition) => {
            const [column = "", operator = "", ...rest] = condition.split(".");
            return (row: Row) => compare(row[column], operator, rest.join("."));
          });
          filters.push((row) => conditions.some((condition) => condition(row)));
          return builder;
        },
        select() {
          return builder;
        },
        // oxlint-disable-next-line unicorn/no-thenable -- Supabase query builders are thenable
        then(resolve: (result: unknown) => unknown) {
          const message = errors[table];
          if (message) {
            return Promise.resolve({
              count: null,
              error: { code: "XX000", details: "", hint: "", message },
            }).then(resolve);
          }

          const rows = (tables[table] ?? []) as Row[];
          const count = rows.filter((row) =>
            filters.every((filter) => filter(row))
          ).length;
          return Promise.resolve({ count, error: null }).then(resolve);
        },
      };
      return builder;
    },
  }) as unknown as SupabaseClient<Database>;

/**
 * The subset of Redis the statistics use, kept in memory. Values are stored as
 * they are given, like `@upstash/redis` does with automatic serialization.
 */
export class FakeRedis {
  readonly sortedSets = new Map<string, Map<string, number>>();
  readonly ttls = new Map<string, number>();
  readonly values = new Map<string, unknown>();

  async get(key: string): Promise<unknown> {
    return this.values.get(key) ?? null;
  }

  async set(
    key: string,
    value: unknown,
    options?: { ex?: number }
  ): Promise<"OK"> {
    this.values.set(key, value);

    if (options?.ex === undefined) {
      this.ttls.delete(key);
    } else {
      this.ttls.set(key, options.ex);
    }

    return "OK";
  }

  async zcard(key: string): Promise<number> {
    return this.sortedSets.get(key)?.size ?? 0;
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    options?: { rev?: boolean; withScores?: boolean }
  ): Promise<unknown[]> {
    if (start !== 0 || stop !== -1 || options?.rev) {
      throw new Error("Unsupported zrange()");
    }

    const members = [...(this.sortedSets.get(key) ?? new Map<string, number>())]
      .sort(([, a], [, b]) => a - b)
      .flatMap(([member, score]) =>
        options?.withScores ? [member, score] : [member]
      );

    return members;
  }

  /** Fill a sorted set, as the apps would with ZADD. */
  seedSortedSet(key: string, scores: Record<string, number>): void {
    const sortedSet = this.sortedSets.get(key) ?? new Map<string, number>();

    for (const [member, score] of Object.entries(scores)) {
      sortedSet.set(member, score);
    }

    this.sortedSets.set(key, sortedSet);
  }

  asRedis(): Redis {
    return this as unknown as Redis;
  }
}
