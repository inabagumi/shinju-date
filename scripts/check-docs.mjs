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
 * Usage:
 *   node scripts/check-docs.mjs
 */

import { execFileSync } from 'node:child_process'
import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Files placed by the `skills` CLI, which are not edited by hand */
const IGNORED_FILES = [/^\.agents\//, /^\.claude\//]

/** Top-level directories whose paths in inline code are checked */
const PATH_PREFIXES = ['.github/', 'apps/', 'docs/', 'packages/', 'scripts/']

const INLINE_CODE_PATTERN = /(`+)([^`]+?)\1/g
const LINK_PATTERN = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g
const LINK_DEFINITION_PATTERN = /^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/
const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i
const FENCE_PATTERN = /^\s*(`{3,}|~{3,})/

/** @type {Map<string, Set<string>>} */
const anchorCache = new Map()

function listMarkdownFiles() {
  const output = execFileSync('git', ['ls-files', '-z', '*.md'], {
    cwd: root,
    encoding: 'utf8',
  })

  return output
    .split('\0')
    .filter(Boolean)
    .filter((file) => !IGNORED_FILES.some((pattern) => pattern.test(file)))
}

/**
 * @param {string} path - Absolute path, which may contain `*`
 */
function pathExists(path) {
  if (path.includes('*')) {
    return globSync(relative(root, path), { cwd: root }).length > 0
  }

  return existsSync(path)
}

/**
 * @param {string} value - Part of a URL
 */
function decode(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    // Keep the value as it is when it is not a valid URI component
    return value
  }
}

/**
 * Split lines into the lines outside fenced code blocks.
 *
 * @param {string[]} lines - Lines of a Markdown file
 * @returns {Array<[number, string]>} Pairs of an index and a line
 */
function linesOutsideFences(lines) {
  const result = []
  let fence = null

  for (const [index, line] of lines.entries()) {
    const fenceMatch = line.match(FENCE_PATTERN)

    if (fenceMatch) {
      const marker = fenceMatch[1]

      if (fence === null) {
        fence = marker
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null
      }

      continue
    }

    if (fence === null) {
      result.push([index, line])
    }
  }

  return result
}

/**
 * Make the anchor GitHub gives a heading.
 *
 * @param {string} heading - Text of a heading
 */
function slugify(heading) {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-')
}

/**
 * @param {string} path - Absolute path of a Markdown file
 */
function getAnchors(path) {
  const cached = anchorCache.get(path)

  if (cached) {
    return cached
  }

  const anchors = new Set()
  const counts = new Map()
  const lines = readFileSync(path, 'utf8').split('\n')

  for (const [, line] of linesOutsideFences(lines)) {
    const heading = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/)

    if (heading) {
      const slug = slugify(heading[1])
      const count = counts.get(slug) ?? 0

      anchors.add(count === 0 ? slug : `${slug}-${count}`)
      counts.set(slug, count + 1)
    }

    for (const match of line.matchAll(/<a\s[^>]*(?:id|name)="([^"]+)"/g)) {
      anchors.add(match[1])
    }
  }

  anchorCache.set(path, anchors)

  return anchors
}

/**
 * @param {string} code - Content of inline code
 * @returns {string | null} Path to check, or null when it is not a path
 */
function extractPath(code) {
  const text = code.trim()

  if (!PATH_PREFIXES.some((prefix) => text.startsWith(prefix))) {
    return null
  }

  // Not a single path (a command, a sentence, a placeholder such as `<name>`)
  if (/[\s<>{}$…]/.test(text)) {
    return null
  }

  // Strip a line number (`apps/web/proxy.ts:12`) and an anchor
  return text.replace(/:\d+(?:-\d+)?$/, '').replace(/#.*$/, '')
}

/**
 * @param {string} file - Markdown file relative to the repository root
 */
function checkFile(file) {
  const errors = []
  const filePath = join(root, file)
  const lines = readFileSync(filePath, 'utf8').split('\n')
  const baseDir = dirname(filePath)

  for (const [index, line] of linesOutsideFences(lines)) {
    const report = (message) => {
      errors.push({ line: index + 1, message })
    }

    const targets = []
    const textWithoutCode = line.replace(INLINE_CODE_PATTERN, (match) =>
      ' '.repeat(match.length),
    )

    for (const match of textWithoutCode.matchAll(LINK_PATTERN)) {
      targets.push(match[1])
    }

    const definition = textWithoutCode.match(LINK_DEFINITION_PATTERN)

    if (definition) {
      targets.push(definition[1])
    }

    for (const target of targets) {
      if (SCHEME_PATTERN.test(target)) {
        continue
      }

      const [pathPart = '', fragment] = target.replace(/\?[^#]*/, '').split('#')
      const path = decode(pathPart)
      let absolutePath = filePath

      if (path !== '') {
        absolutePath = path.startsWith('/')
          ? join(root, path)
          : resolve(baseDir, path)

        if (!pathExists(absolutePath)) {
          report(`Link to a missing path: ${target}`)
          continue
        }
      }

      if (
        fragment &&
        absolutePath.endsWith('.md') &&
        !getAnchors(absolutePath).has(decode(fragment).toLowerCase())
      ) {
        report(`Link to a missing heading: ${target}`)
      }
    }

    for (const match of line.matchAll(INLINE_CODE_PATTERN)) {
      const path = extractPath(match[2])

      if (path !== null && !pathExists(join(root, path))) {
        report(`Missing path in inline code: ${path}`)
      }
    }
  }

  return errors
}

const files = listMarkdownFiles()
let errorCount = 0

for (const file of files) {
  for (const { line, message } of checkFile(file)) {
    errorCount += 1

    if (process.env.GITHUB_ACTIONS === 'true') {
      console.log(`::error file=${file},line=${line}::${message}`)
    } else {
      console.error(`${file}:${line}: ${message}`)
    }
  }
}

if (errorCount > 0) {
  console.error(
    `\nFound ${errorCount} missing path(s) in ${files.length} Markdown files.`,
  )
  process.exit(1)
}

console.log(`Checked ${files.length} Markdown files.`)
