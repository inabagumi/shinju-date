/**
 * Tests for `scripts/check-cache-directives.mjs`.
 *
 * Usage:
 *   pnpm exec vitest run scripts/check-cache-directives.test.mjs
 */

import { describe, expect, it } from "vitest";

import { findMissingBlankLines } from "./check-cache-directives.mjs";

/**
 * @param {string} source - Source code to check
 * @param {string} [fileName] - Name of the file, which chooses the parser
 */
const lines = (source, fileName = "fixture.ts") =>
  findMissingBlankLines(source, fileName).map(({ line }) => line);

describe(findMissingBlankLines, () => {
  it("accepts blank lines after the directive and the cache functions", () => {
    const source = `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

  return await fetchTalent()
}
`;

    expect(lines(source)).toStrictEqual([]);
  });

  it("reports a statement right after the directive", () => {
    const source = `export async function getTalent() {
  'use cache'
  return await fetchTalent()
}
`;

    expect(lines(source)).toStrictEqual([3]);
  });

  it("reports the cache functions right after the directive", () => {
    const source = `export async function getTalent() {
  'use cache: private'
  cacheLife('minutes')

  return await fetchTalent()
}
`;

    expect(lines(source)).toStrictEqual([3]);
  });

  it("reports a statement right after the cache functions", () => {
    const source = `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')
  return await fetchTalent()
}
`;

    expect(lines(source)).toStrictEqual([6]);
  });

  it("reports a comment that is not separated by a blank line", () => {
    const source = `export async function getTalent() {
  'use cache: remote'
  // Cached for an hour
  cacheLife('hours')

  return await fetchTalent()
}
`;

    expect(lines(source)).toStrictEqual([4]);
  });

  it("accepts the directive and the cache functions at the end of a block", () => {
    const source = `export async function warm() {
  'use cache'
}

export async function tag(id) {
  cacheTag(id)
}
`;

    expect(lines(source, "fixture.js")).toStrictEqual([]);
  });

  it("checks the directive at the top of a file", () => {
    const source = `'use cache'
export async function getTalent() {}
`;

    expect(lines(source)).toStrictEqual([2]);
  });

  it("checks arrow functions, methods and nested blocks in TSX", () => {
    const source = `const getTalent = async () => {
  'use cache: remote'
  return <div />
}

class Repository {
  async find() {
    'use cache'

    if (cond) {
      cacheTag('talents')
      return <div />
    }
  }
}
`;

    expect(lines(source, "fixture.tsx")).toStrictEqual([3, 12]);
  });

  it("ignores other directives and other functions", () => {
    const source = `'use client'
import { useState } from 'react'

export async function getTalent() {
  'use server'
  revalidateTag('talents')
  return 'use cache'
}
`;

    expect(lines(source)).toStrictEqual([]);
  });
});
