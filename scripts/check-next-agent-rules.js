#!/usr/bin/env node

/**
 * Check that each Next.js app's AGENTS.md has the agent rules block that its
 * installed `next` writes.
 *
 * `next dev` rewrites the block between `<!-- BEGIN:nextjs-agent-rules -->`
 * and `<!-- END:nextjs-agent-rules -->` whenever it differs from the content
 * built into the installed version. If the committed block is out of date,
 * every coding agent that starts `next dev` gets an unrelated diff in
 * AGENTS.md. This script reuses Next.js's own functions so that the check
 * always matches what `next dev` writes.
 *
 * Usage:
 *   node scripts/check-next-agent-rules.js        # check only
 *   node scripts/check-next-agent-rules.js --fix  # rewrite outdated blocks
 *   pnpm agents:check
 *   pnpm agents:check --fix
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

// Not part of Next.js's public API. The block itself points here, so if
// Next.js moves it, this script fails instead of silently passing.
const GENERATE_AGENT_FILES_PATH = 'next/dist/server/lib/generate-agent-files.js'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const appsDir = join(rootDir, 'apps')
const fix = process.argv.includes('--fix')

/**
 * Find the apps that depend on `next`
 * @returns {string[]} Absolute paths of the app directories
 */
function findNextApps() {
  return readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(appsDir, entry.name))
    .filter((appDir) => {
      const packageJsonPath = join(appDir, 'package.json')

      if (!existsSync(packageJsonPath)) {
        return false
      }

      const { dependencies = {}, devDependencies = {} } = JSON.parse(
        readFileSync(packageJsonPath, 'utf-8'),
      )

      return 'next' in dependencies || 'next' in devDependencies
    })
}

let outdated = 0

for (const appDir of findNextApps()) {
  const require = createRequire(join(appDir, 'package.json'))
  const { hasCurrentAgentRules, writeAgentFiles } = require(
    GENERATE_AGENT_FILES_PATH,
  )
  const agentsMdPath = relative(rootDir, join(appDir, 'AGENTS.md'))

  if (hasCurrentAgentRules(appDir)) {
    console.log(`✓ ${agentsMdPath}`)
    continue
  }

  if (fix) {
    writeAgentFiles(appDir)
    console.log(`✎ ${agentsMdPath} (updated)`)
    continue
  }

  console.error(`✗ ${agentsMdPath}`)
  outdated++
}

if (outdated > 0) {
  console.error(
    '\nThe Next.js agent rules block in AGENTS.md does not match what the installed `next` writes.\nRun `pnpm agents:check --fix` and commit the result.',
  )
  process.exit(1)
}
