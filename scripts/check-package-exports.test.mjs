/**
 * Tests for `scripts/check-package-exports.mjs`.
 *
 * Usage:
 *   pnpm exec vitest run scripts/check-package-exports.test.mjs
 */

import { describe, expect, it } from "vitest";

import { findExportsProblems } from "./check-package-exports.mjs";

const always = () => true;

/**
 * Build an `exports` entry whose conditions keep the given order, which is
 * what the check looks at.
 * @param {[string, string][]} conditions
 */
function entry(...conditions) {
  return Object.fromEntries(conditions);
}

/** @param {string} name */
function typesAndDefault(name) {
  return entry(
    ["types", `./dist/${name}.d.ts`],
    ["default", `./dist/${name}.js`]
  );
}

describe(findExportsProblems, () => {
  it("accepts entries with `types` and `default`", () => {
    const pkg = {
      exports: {
        ".": typesAndDefault("index"),
        "./server": typesAndDefault("server"),
      },
    };

    expect(findExportsProblems(pkg, always)).toStrictEqual([]);
  });

  it("accepts a path without conditions for a file that is not JavaScript", () => {
    const pkg = { exports: { "./theme.css": "./theme.css" } };

    expect(findExportsProblems(pkg, always)).toStrictEqual([]);
  });

  it("reports a package without `exports`", () => {
    const pkg = { main: "./dist/index.js", types: "./dist/index.d.ts" };

    expect(findExportsProblems(pkg, always)).toHaveLength(3);
  });

  it("reports `types` after `default`", () => {
    const pkg = {
      exports: {
        ".": entry(
          ["default", "./dist/index.js"],
          ["types", "./dist/index.d.ts"]
        ),
      },
    };

    expect(findExportsProblems(pkg, always)).toHaveLength(1);
  });

  it("reports `import` instead of `default`", () => {
    const pkg = {
      exports: {
        ".": entry(
          ["types", "./dist/index.d.ts"],
          ["import", "./dist/index.js"]
        ),
      },
    };

    expect(findExportsProblems(pkg, always)).toHaveLength(1);
  });

  it("reports an entry without `types`", () => {
    const pkg = {
      exports: { "./register": entry(["default", "./dist/register.js"]) },
    };

    expect(findExportsProblems(pkg, always)).toHaveLength(1);
  });

  it("reports a JavaScript file without conditions", () => {
    const pkg = { exports: { ".": "./dist/index.js" } };

    expect(findExportsProblems(pkg, always)).toHaveLength(1);
  });

  it("reports `typesVersions`", () => {
    const pkg = {
      exports: { ".": typesAndDefault("index") },
      typesVersions: { "*": { "*": ["./dist/*"] } },
    };

    expect(findExportsProblems(pkg, always)).toHaveLength(1);
  });

  it("reports the files that do not exist", () => {
    const pkg = { exports: { ".": typesAndDefault("index") } };
    const problems = findExportsProblems(
      pkg,
      (target) => target !== "./dist/index.js"
    );

    expect(problems).toStrictEqual([
      '"exports"["."] の ./dist/index.js がありません',
    ]);
  });
});
