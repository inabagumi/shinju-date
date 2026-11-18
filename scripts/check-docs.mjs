#!/usr/bin/env node

/**
 * Check that the repository paths written in Markdown files exist.
 *
 * - Relative links (`[text](../docs/setup-guide.md)`) and link definitions
 *   (`[text]: ./path`), including the heading of an anchor to a Markdown file
 *   (`[text](setup-guide.md#1-初期セットアップ)`)
 * - File paths in inline code that start with a top-level directory of the
 *   repository (`apps/web/proxy.ts`, `docs/msw-guide.md`, ...)
 *
 * External URLs are not checked, so that CI does not fail for reasons outside
 * the repository. Fenced code blocks are skipped.
 *
 * A path exists when Git tracks it, or when it is a new file that is not
 * ignored, so that ignored leftovers (such as `node_modules` of a removed app)
 * do not hide a broken link.
 *
 * Usage:
 *   node scripts/check-docs.mjs
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

/** Files placed by the `skills` CLI, which are not edited by hand */
const IGNORED_FILES = [/^\.agents\//u, /^\.claude\//u];

/** Top-level directories whose paths in inline code are checked */
const PATH_PREFIXES = [".github/", "apps/", "docs/", "packages/", "scripts/"];

const INLINE_CODE_PATTERN = /(?<ticks>`+)(?<code>[^`]+?)\k<ticks>/gu;
const LINK_DEFINITION_PATTERN =
  /^ {0,3}\[[^\]]+\]:[ \t]*<?(?<target>[^\s>]+)>?/gmu;
const SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/u;
const FENCE_PATTERN = /^\s*(?<fence>`{3,}|~{3,})/u;
const CLOSING_FENCE_PATTERN = /^\s*(?<fence>`{3,}|~{3,})[ \t]*$/u;

/** @type {Map<string, Set<string>>} */
const anchorCache = new Map();

/**
 * List the files Git tracks and the new files that are not ignored.
 *
 * @param {string[]} pathspecs - Pathspecs to limit the files
 */
const listFiles = (pathspecs = []) => {
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
      ...pathspecs,
    ],
    { cwd: root, encoding: "utf-8" }
  );

  return output.split("\0").filter(Boolean);
};

/** Files and their parent directories, relative to the repository root */
const knownPaths = new Set([""]);

for (const file of listFiles()) {
  const parts = file.split("/");

  for (let index = 1; index <= parts.length; index += 1) {
    knownPaths.add(parts.slice(0, index).join("/"));
  }
}

const listMarkdownFiles = () =>
  listFiles(["*.md"]).filter(
    (file) => !IGNORED_FILES.some((pattern) => pattern.test(file))
  );

/**
 * @param {string} pattern - Path that contains `*`
 */
const globToRegExp = (pattern) => {
  const source = pattern
    .split(/(?<wildcard>\*\*\/|\*\*|\*)/u)
    .map((part) => {
      if (part === "**/") {
        return "(?:.*/)?";
      }

      if (part === "**") {
        return ".*";
      }

      if (part === "*") {
        return "[^/]*";
      }

      return part.replaceAll(/[.+?^${}()|[\]\\]/gu, "\\$&");
    })
    .join("");

  return new RegExp(`^${source}$`, "u");
};

/**
 * @param {string} absolutePath - Absolute path, which may contain `*`
 */
const pathExists = (absolutePath) => {
  const relativePath = path.relative(root, absolutePath).split("\\").join("/");

  if (relativePath.startsWith("..")) {
    return false;
  }

  if (relativePath.includes("*")) {
    const pattern = globToRegExp(relativePath);

    return [...knownPaths].some((knownPath) => pattern.test(knownPath));
  }

  return knownPaths.has(relativePath);
};

/**
 * @param {string} value - Part of a URL
 */
const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    // Keep the value as it is when it is not a valid URI component
    return value;
  }
};

/**
 * Blank out fenced code blocks, keeping the line numbers.
 *
 * @param {string[]} lines - Lines of a Markdown file
 * @returns {string[]} Lines with the fenced code blocks replaced by ''
 */
const blankFences = (lines) => {
  const result = [];
  let fence = null;

  for (const line of lines) {
    if (fence === null) {
      const opening = line.match(FENCE_PATTERN);

      if (opening) {
        ({ fence } = opening.groups);
      }

      result.push(opening ? "" : line);
      continue;
    }

    const closing = line.match(CLOSING_FENCE_PATTERN);

    if (
      closing &&
      closing.groups.fence[0] === fence[0] &&
      closing.groups.fence.length >= fence.length
    ) {
      fence = null;
    }

    result.push("");
  }

  return result;
};

/**
 * Replace inline code with spaces, keeping the offsets and the line breaks.
 *
 * @param {string} text - Markdown text
 */
const blankInlineCode = (text) =>
  text.replaceAll(INLINE_CODE_PATTERN, (match) =>
    // Keep the UTF-16 length of each character (an astral character is 2)
    match.replaceAll(/[^\n]/gu, (char) => " ".repeat(char.length))
  );

/**
 * Read the destination of an inline link, which may contain balanced
 * parentheses and line breaks.
 *
 * @param {string} text - Markdown text without code
 * @param {number} start - Index just after `](`
 * @returns {string | null} Destination, or null when it is not a link
 */
const readDestination = (text, start) => {
  let index = start;

  while (index < text.length && /\s/u.test(text[index])) {
    index += 1;
  }

  if (text[index] === "<") {
    const end = text.indexOf(">", index);

    return end === -1 ? null : text.slice(index + 1, end);
  }

  let depth = 0;
  let destination = "";

  for (; index < text.length; index += 1) {
    const char = text[index];

    if (char === "\\" && index + 1 < text.length) {
      destination += text[index + 1];
      index += 1;
    } else if (/\s/u.test(char)) {
      break;
    } else if (char === "(") {
      depth += 1;
      destination += char;
    } else if (char === ")") {
      if (depth === 0) {
        break;
      }

      depth -= 1;
      destination += char;
    } else {
      destination += char;
    }
  }

  return destination === "" ? null : destination;
};

/**
 * Find the destinations of the links in Markdown text without code.
 *
 * @param {string} text - Markdown text without code
 * @returns {Array<{ index: number, target: string }>} Destinations and the
 *   indexes where their links start
 */
const findLinks = (text) => {
  const links = [];

  for (const match of text.matchAll(/\]\(/gu)) {
    const target = readDestination(text, match.index + 2);

    if (target !== null) {
      links.push({ index: text.lastIndexOf("[", match.index), target });
    }
  }

  for (const match of text.matchAll(LINK_DEFINITION_PATTERN)) {
    links.push({ index: match.index, target: match.groups.target });
  }

  return links;
};

/**
 * Make the anchor GitHub gives a heading.
 *
 * @param {string} heading - Text of a heading
 */
const slugify = (heading) => {
  let text = heading.replaceAll(
    /!?\[(?<label>[^\]]*)\]\([^)]*\)/gu,
    "$<label>"
  );
  let previous;

  do {
    previous = text;
    text = text.replaceAll(/<[^<>]*>/gu, "");
  } while (text !== previous);

  // Remove the emphasis marks, but keep the content of code spans as it is.
  // Code spans are replaced with placeholders first, so that emphasis around
  // a code span is matched as a whole.
  const codeSpans = [];

  text = text
    .replaceAll(
      /(?<ticks>`+)(?<content>[^`]*?)\k<ticks>/gu,
      (_match, _ticks, content) => {
        codeSpans.push(content);

        return `\uE000${codeSpans.length - 1}\uE001`;
      }
    )
    .replaceAll("*", "")
    .replaceAll(
      /(?<before>^|[^\p{L}\p{N}_])_+(?<content>[^_]+?)_+(?=$|[^\p{L}\p{N}_])/gu,
      "$<before>$<content>"
    )
    .replaceAll(
      /\uE000(?<index>\d+)\uE001/gu,
      (_match, index) => codeSpans[Number(index)]
    );

  return text
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, "")
    .replaceAll(" ", "-");
};

/**
 * @param {string} filePath - Absolute path of a Markdown file
 */
const getAnchors = (filePath) => {
  const cached = anchorCache.get(filePath);

  if (cached) {
    return cached;
  }

  const anchors = new Set();
  const occurrences = new Map();
  // Headings in block quotes also get anchors, so drop the quote markers
  const lines = blankFences(readFileSync(filePath, "utf-8").split("\n")).map(
    (line) => line.replace(/^(?: {0,3}>[ \t]?)+/u, "")
  );

  // The same way as GitHub (github-slugger) avoids duplicate anchors
  const addHeading = (heading) => {
    const base = slugify(heading);
    let slug = base;

    if (occurrences.has(slug)) {
      do {
        const count = occurrences.get(base) + 1;

        occurrences.set(base, count);
        slug = `${base}-${count}`;
      } while (occurrences.has(slug));
    }

    occurrences.set(slug, 0);
    anchors.add(slug);
  };

  for (const [index, line] of lines.entries()) {
    const atx = line.match(/^\s{0,3}#{1,6}\s+(?<heading>.+?)(?:\s+#+)?\s*$/u);
    const next = lines[index + 1] ?? "";

    if (atx) {
      addHeading(atx.groups.heading);
    } else if (
      /^\s{0,3}(?:=+|-+)\s*$/u.test(next) &&
      line.trim() !== "" &&
      !/^\s{0,3}(?:[-*+>|]|\d+[.)])/u.test(line)
    ) {
      // Setext heading (a line underlined with `===` or `---`)
      addHeading(line.trim());
    }

    for (const match of line.matchAll(
      /<a\s[^>]*(?:id|name)="(?<anchor>[^"]+)"/gu
    )) {
      anchors.add(match.groups.anchor);
    }
  }

  anchorCache.set(filePath, anchors);

  return anchors;
};

/**
 * @param {string} code - Content of inline code
 * @returns {string | null} Path to check, or null when it is not a path
 */
const extractPath = (code) => {
  const text = code.trim();

  if (!PATH_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    return null;
  }

  // Not a single path (a command, a sentence, a placeholder such as `<name>`)
  if (/[\s<>{}$…]/u.test(text)) {
    return null;
  }

  // Strip a line number (`apps/web/proxy.ts:12`) and an anchor
  return text.replace(/:\d+(?:-\d+)?$/u, "").replace(/#.*$/u, "");
};

/**
 * @param {string} file - Markdown file relative to the repository root
 */
const checkFile = (file) => {
  const errors = [];
  const filePath = path.join(root, file);
  const baseDir = path.dirname(filePath);
  const lines = blankFences(readFileSync(filePath, "utf-8").split("\n"));
  const text = lines.join("\n");
  const lineStarts = [0];

  for (const line of lines) {
    lineStarts.push(lineStarts.at(-1) + line.length + 1);
  }

  const lineAt = (offset) =>
    lineStarts.findLastIndex((lineStart) => lineStart <= offset) + 1;

  for (const { index, target } of findLinks(blankInlineCode(text))) {
    const report = (message) => {
      errors.push({ line: lineAt(index), message });
    };

    if (SCHEME_PATTERN.test(target)) {
      continue;
    }

    const [pathPart = "", fragment] = target.replace(/\?[^#]*/u, "").split("#");
    const linkPath = decode(pathPart);
    let absolutePath = filePath;

    if (linkPath !== "") {
      absolutePath = linkPath.startsWith("/")
        ? path.join(root, linkPath)
        : path.resolve(baseDir, linkPath);

      if (!pathExists(absolutePath)) {
        report(`Link to a missing path: ${target}`);
        continue;
      }
    }

    if (
      fragment &&
      absolutePath.endsWith(".md") &&
      !getAnchors(absolutePath).has(decode(fragment).toLowerCase())
    ) {
      report(`Link to a missing heading: ${target}`);
    }
  }

  for (const match of text.matchAll(INLINE_CODE_PATTERN)) {
    const codePath = extractPath(match.groups.code);

    if (codePath !== null && !pathExists(path.join(root, codePath))) {
      errors.push({
        line: lineAt(match.index),
        message: `Missing path in inline code: ${codePath}`,
      });
    }
  }

  return errors.toSorted((a, b) => a.line - b.line);
};

const files = listMarkdownFiles();
let errorCount = 0;

for (const file of files) {
  for (const { line, message } of checkFile(file)) {
    errorCount += 1;

    if (process.env.GITHUB_ACTIONS === "true") {
      console.log(`::error file=${file},line=${line}::${message}`);
    } else {
      console.error(`${file}:${line}: ${message}`);
    }
  }
}

if (errorCount > 0) {
  console.error(
    `\nFound ${errorCount} missing path(s) in ${files.length} Markdown files.`
  );
  process.exit(1);
}

console.log(`Checked ${files.length} Markdown files.`);
