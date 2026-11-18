#!/usr/bin/env node

/**
 * Check that commit messages and pull requests have no URLs that most people
 * cannot open.
 *
 * URLs of AI agent sessions and of private pages need a login (or a specific
 * environment) and show an error to everyone else, so they are useless in the
 * public history. A pull request's title and body become the commit message
 * when it is merged, so they are checked too.
 *
 * The workflow `.github/workflows/check-private-urls.yml` checks the title,
 * the body and the commits of each pull request with the exported functions.
 *
 * Usage:
 *   node scripts/check-private-urls.mjs [base]
 *
 * Checks the messages of the commits from `base` (default: `origin/main`) to
 * `HEAD`, for use before pushing.
 */

import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * URLs that most people cannot open. Add a pattern here to check more URLs.
 *
 * Each pattern matches the URL up to (not including) the first character that
 * cannot be part of it, and must have the `g` flag.
 *
 * @type {{ name: string, pattern: RegExp }[]}
 */
export const PRIVATE_URL_PATTERNS = [
  {
    // Sessions, artifacts, chats and projects of Claude need the owner's login
    name: 'Claude のセッション・アーティファクト・会話・プロジェクト',
    pattern:
      /https?:\/\/(?:www\.)?claude\.ai\/(?:code\/(?:session_|artifact\/)|artifact\/|chat\/|project\/)[^\s<>()[\]{}"'`]*/gi,
  },
]

/**
 * @typedef {object} PrivateUrl
 * @property {number} line - 1-based line number
 * @property {string} name - Name of the pattern that matched
 * @property {string} url
 */

/**
 * Find the URLs that most people cannot open.
 *
 * @param {string} text
 * @returns {PrivateUrl[]}
 */
export function findPrivateUrls(text) {
  /** @type {PrivateUrl[]} */
  const found = []

  for (const [index, lineText] of text.split(/\r?\n/).entries()) {
    for (const { name, pattern } of PRIVATE_URL_PATTERNS) {
      for (const match of lineText.matchAll(pattern)) {
        found.push({ line: index + 1, name, url: match[0] })
      }
    }
  }

  return found
}

/**
 * @typedef {object} Source
 * @property {string} label - Where the text is from, e.g. `commit abc1234`
 * @property {string} text
 */

/**
 * @typedef {PrivateUrl & { label: string }} Problem
 */

/**
 * Find the URLs that most people cannot open in each source.
 *
 * @param {Source[]} sources
 * @returns {Problem[]}
 */
export function findProblems(sources) {
  return sources.flatMap(({ label, text }) =>
    findPrivateUrls(text ?? '').map((found) => ({ label, ...found })),
  )
}

/**
 * Format a problem for the log.
 *
 * @param {Problem} problem
 */
export function formatProblem({ label, line, name, url }) {
  return `${label} (${line} 行目): ${url} (${name})`
}

export const GUIDANCE =
  'ほとんどの人が開けない URL は、コミットメッセージとプルリクエストに書かないでください。CONTRIBUTING.md の「コミットメッセージ」を参照。'

/**
 * List the commits from `base` to `HEAD` with their messages.
 *
 * @param {string} base
 * @returns {Source[]}
 */
function listCommits(base) {
  const output = execFileSync(
    'git',
    ['log', '-z', '--format=%h%n%B', `${base}..HEAD`],
    { cwd: root, encoding: 'utf8' },
  )

  return output
    .split('\0')
    .filter(Boolean)
    .map((entry) => {
      const newline = entry.indexOf('\n')

      return {
        label: `commit ${entry.slice(0, newline)}`,
        text: entry.slice(newline + 1),
      }
    })
}

function main() {
  const base = process.argv[2] ?? 'origin/main'
  const problems = findProblems(listCommits(base))

  for (const problem of problems) {
    console.error(formatProblem(problem))
  }

  if (problems.length > 0) {
    console.error(`\n${problems.length} 件の問題があります。${GUIDANCE}`)
    process.exitCode = 1
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
}
