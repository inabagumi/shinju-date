#!/usr/bin/env node

/**
 * Check that every package in `packages/*` has `exports` in the same shape,
 * and that the files it points to exist.
 *
 * - `exports` is an object whose keys are subpaths (`.`, `./server`, ...)
 * - Each entry is `{ "types": ..., "default": ... }`, with `types` first,
 *   because TypeScript uses the first condition that matches
 * - An entry for a file that is not JavaScript (such as `./theme.css`) is a
 *   path without conditions
 * - `main`, `module`, `types`, `typings` and `typesVersions` are not used,
 *   because `exports` replaces them
 * - Every file that `exports` points to exists
 *
 * Run it after `pnpm run build`, because most entries point to `dist/`. See
 * `packages/config/README.md`.
 *
 * Usage:
 *   node scripts/check-package-exports.mjs
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PACKAGES_DIR = "packages";

const CONDITIONS = ["types", "default"];

const REPLACED_FIELDS = ["main", "module", "types", "typings", "typesVersions"];

const SCRIPT_PATTERN = /\.[cm]?[jt]sx?$/;

/**
 * Find the problems in the `exports` of a `package.json`.
 * @param {Record<string, unknown>} pkg - The parsed `package.json`
 * @param {(target: string) => boolean} fileExists - Whether a path relative to
 *   the package exists
 * @returns {string[]} The problems
 */
export function findExportsProblems(pkg, fileExists) {
  /** @type {string[]} */
  const problems = [];

  for (const field of REPLACED_FIELDS) {
    if (field in pkg) {
      problems.push(`"${field}" は不要です（"exports" を使います）`);
    }
  }

  const { exports } = pkg;

  if (
    typeof exports !== "object" ||
    exports === null ||
    Array.isArray(exports)
  ) {
    problems.push('"exports" がありません（サブパスをキーにしたオブジェクト）');

    return problems;
  }

  for (const [subpath, entry] of Object.entries(exports)) {
    if (subpath !== "." && !subpath.startsWith("./")) {
      problems.push(
        `"exports" のキー "${subpath}" は "." か "./" で始まるサブパスにします`
      );
      continue;
    }

    /** @type {string[]} */
    let targets;

    if (typeof entry === "string") {
      if (SCRIPT_PATTERN.test(entry)) {
        problems.push(
          `"exports"["${subpath}"] は { "types": ..., "default": ... } にします`
        );
        continue;
      }

      targets = [entry];
    } else if (
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry)
    ) {
      const keys = Object.keys(entry);

      if (
        keys.length !== CONDITIONS.length ||
        keys.some((key, index) => key !== CONDITIONS[index])
      ) {
        problems.push(
          `"exports"["${subpath}"] の条件は "types"、"default" の順の2つにします（今は ${JSON.stringify(keys)}）`
        );
        continue;
      }

      targets = Object.values(entry);
    } else {
      problems.push(
        `"exports"["${subpath}"] は { "types": ..., "default": ... } にします`
      );
      continue;
    }

    for (const target of targets) {
      if (typeof target !== "string" || !target.startsWith("./")) {
        problems.push(
          `"exports"["${subpath}"] のパス ${JSON.stringify(target)} は "./" で始めます`
        );
      } else if (!fileExists(target)) {
        problems.push(`"exports"["${subpath}"] の ${target} がありません`);
      }
    }
  }

  return problems;
}

function main() {
  let count = 0;

  const names = readdirSync(join(root, PACKAGES_DIR), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of names) {
    const dir = join(root, PACKAGES_DIR, name);
    const file = join(dir, "package.json");

    if (!existsSync(file)) {
      continue;
    }

    const pkg = JSON.parse(readFileSync(file, "utf8"));
    const problems = findExportsProblems(pkg, (target) =>
      existsSync(join(dir, target))
    );

    for (const problem of problems) {
      console.error(`${PACKAGES_DIR}/${name}/package.json: ${problem}`);
      count++;
    }
  }

  if (count > 0) {
    console.error(
      `\n${count} 件の問題があります。ファイルがない場合は、先に \`pnpm run build\` を実行してください。packages/config/README.md の「package.json の exports」を参照。`
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
