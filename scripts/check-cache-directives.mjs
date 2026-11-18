#!/usr/bin/env node

/**
 * Check that a blank line follows the cache directives.
 *
 * - A `'use cache'` directive (including `'use cache: remote'` and
 *   `'use cache: private'`) must be followed by a blank line
 * - A run of `cacheLife()` and `cacheTag()` calls must be followed by a blank
 *   line
 *
 * Nothing is required when the directive or the run ends the block. See
 * "キャッシュのディレクティブ" in AGENTS.md.
 *
 * This is not an oxlint rule yet, so this script checks it.
 *
 * Usage:
 *   node scripts/check-cache-directives.mjs [files...]
 *
 * Without files, the JavaScript and TypeScript files that Git tracks (and the
 * new files that are not ignored) are checked.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";

const root = resolve(import.meta.dirname, "..");

const SOURCE_PATTERNS = [
  "*.cjs",
  "*.cts",
  "*.js",
  "*.jsx",
  "*.mjs",
  "*.mts",
  "*.ts",
  "*.tsx",
];

/** Files placed by the `skills` CLI, which are not edited by hand */
const IGNORED_FILES = [/^\.agents\//, /^\.claude\//];

const CACHE_FUNCTIONS = new Set(["cacheLife", "cacheTag"]);

const BLANK_LINE_PATTERN = /\n[ \t]*\r?\n/;

/**
 * @typedef {object} Problem
 * @property {number} line - 1-based line number
 * @property {number} column - 1-based column number
 * @property {string} message
 */

/** @param {string} fileName */
const getScriptKind = (fileName) => {
  if (/\.[cm]?tsx?$/.test(fileName)) {
    return fileName.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  }

  return fileName.endsWith("x") ? ts.ScriptKind.JSX : ts.ScriptKind.JS;
};

/** @param {ts.Statement} statement */
const isCacheDirective = (statement) =>
  ts.isExpressionStatement(statement) &&
  ts.isStringLiteral(statement.expression) &&
  statement.expression.text.startsWith("use cache");

/** @param {ts.Statement} statement */
const isCacheFunctionCall = (statement) => {
  if (!ts.isExpressionStatement(statement)) {
    return false;
  }

  const { expression } = statement;

  return (
    ts.isCallExpression(expression) &&
    ts.isIdentifier(expression.expression) &&
    CACHE_FUNCTIONS.has(expression.expression.text)
  );
};

/**
 * Find the directives and the runs of cache function calls that are not
 * followed by a blank line.
 *
 * @param {string} sourceText
 * @param {string} fileName - Used to choose the parser (TS, TSX, JS or JSX)
 * @returns {Problem[]}
 */
export const findMissingBlankLines = (sourceText, fileName) => {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(fileName)
  );

  /** @type {Problem[]} */
  const problems = [];

  /**
   * @param {ts.Statement} statement
   * @param {ts.Statement} next
   * @param {string} message
   */
  const requireBlankLine = (statement, next, message) => {
    const between = sourceText.slice(statement.end, next.getStart(sourceFile));

    if (BLANK_LINE_PATTERN.test(between)) {
      return;
    }

    const { character, line } = sourceFile.getLineAndCharacterOfPosition(
      next.getStart(sourceFile)
    );

    problems.push({ column: character + 1, line: line + 1, message });
  };

  /** @param {readonly ts.Statement[]} statements */
  const checkStatements = (statements) => {
    for (const [index, statement] of statements.entries()) {
      const next = statements[index + 1];

      if (!next) {
        break;
      }

      if (isCacheDirective(statement)) {
        requireBlankLine(
          statement,
          next,
          `'use cache' のディレクティブの後に空行を入れてください。`
        );
      } else if (isCacheFunctionCall(statement) && !isCacheFunctionCall(next)) {
        requireBlankLine(
          statement,
          next,
          "cacheLife() と cacheTag() の並びの後に空行を入れてください。"
        );
      }
    }
  };

  /** @param {ts.Node} node */
  const visit = (node) => {
    if (
      ts.isSourceFile(node) ||
      ts.isBlock(node) ||
      ts.isModuleBlock(node) ||
      ts.isCaseOrDefaultClause(node)
    ) {
      checkStatements(node.statements);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  return problems;
};

/** List the files Git tracks and the new files that are not ignored. */
const listSourceFiles = () => {
  const output = execFileSync(
    "git",
    [
      "ls-files",
      "-z",
      "--cached",
      "--others",
      "--exclude-standard",
      "--deduplicate",
      "--",
      ...SOURCE_PATTERNS,
    ],
    { cwd: root, encoding: "utf-8" }
  );

  return output
    .split("\0")
    .filter(Boolean)
    .filter((file) => !IGNORED_FILES.some((pattern) => pattern.test(file)));
};

const main = () => {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : listSourceFiles();
  let count = 0;

  for (const file of files) {
    let sourceText;

    try {
      sourceText = readFileSync(resolve(root, file), "utf-8");
    } catch (error) {
      // A tracked file that was deleted but not yet staged
      if (error?.code === "ENOENT") {
        continue;
      }

      throw error;
    }

    if (
      !sourceText.includes("use cache") &&
      !/\bcache(Life|Tag)\(/.test(sourceText)
    ) {
      continue;
    }

    for (const { column, line, message } of findMissingBlankLines(
      sourceText,
      file
    )) {
      console.error(`${file}:${line}:${column} ${message}`);
      count++;
    }
  }

  if (count > 0) {
    console.error(
      `\n${count} 件の問題があります。AGENTS.md の「キャッシュのディレクティブ」を参照。`
    );
    process.exitCode = 1;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  main();
}
