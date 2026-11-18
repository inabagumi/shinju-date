import { describe, expect, it } from "vitest";

import { shuffle } from "./shuffle";

/**
 * Small seeded PRNG (mulberry32) so the distribution test is deterministic.
 */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

describe(shuffle, () => {
  it("returns an empty array for an empty input", () => {
    expect(shuffle([])).toStrictEqual([]);
  });

  it("returns a single item as is", () => {
    expect(shuffle(["a"])).toStrictEqual(["a"]);
  });

  it("does not modify the input array", () => {
    const items = [1, 2, 3, 4, 5];

    const result = shuffle(items, createRandom(1));

    expect(items).toStrictEqual([1, 2, 3, 4, 5]);
    expect(result).not.toBe(items);
  });

  it("returns the same items in some order", () => {
    const items = Array.from({ length: 20 }, (_, index) => index);

    const result = shuffle(items, createRandom(2));

    expect(result).toHaveLength(items.length);
    expect(result.toSorted((a, b) => a - b)).toStrictEqual(items);
  });

  it("swaps each position with the index picked by `random`", () => {
    // random() = 0 always picks index 0: [1,2,3,4] → [4,2,3,1] → [3,2,4,1] → [2,3,4,1]
    expect(shuffle([1, 2, 3, 4], () => 0)).toStrictEqual([2, 3, 4, 1]);
    // random() close to 1 always picks the current index, so nothing moves
    expect(shuffle([1, 2, 3, 4], () => 0.999999)).toStrictEqual([1, 2, 3, 4]);
  });

  it("makes every order about equally likely", () => {
    const random = createRandom(42);
    const iterations = 60_000;
    const counts = new Map<string, number>();

    for (let i = 0; i < iterations; i++) {
      const key = shuffle(["a", "b", "c"], random).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    // 3! = 6 orders, each expected 10,000 times
    expect(counts.size).toBe(6);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(9500);
      expect(count).toBeLessThan(10_500);
    }
  });
});
