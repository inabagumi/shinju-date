#!/usr/bin/env node

/**
 * Start the development servers of SHINJU DATE
 *
 * Runs the following side by side:
 *
 * - `turbo watch build --filter=./packages/*`: rebuilds a package when its
 *   source changes. It is not a persistent task, so it does not count toward
 *   turbo's concurrency limit, however many packages there are.
 * - `turbo dev --filter=./apps/*`: starts `next dev` of each app.
 *
 * The packages are built once before the apps start, because some apps load
 * them at startup (e.g. `@shinju-date/msw-handlers` in `instrumentation.ts`).
 *
 * The arguments are passed to `turbo dev`. When `--filter` is given, it
 * replaces the default filter for the apps (the packages are still watched).
 *
 * Usage:
 *   pnpm dev
 *   pnpm dev --filter=web
 */

import { spawn } from 'node:child_process'

const PACKAGES_FILTER = '--filter=./packages/*'
const APPS_FILTER = '--filter=./apps/*'

const args = process.argv.slice(2)
const hasFilter = args.some(
  (arg) =>
    arg === '-F' ||
    arg === '--filter' ||
    arg.startsWith('-F=') ||
    arg.startsWith('--filter='),
)

/**
 * Run turbo with the given arguments
 * @param {string[]} turboArgs - Arguments for turbo
 * @returns {import('node:child_process').ChildProcess} The child process
 */
function turbo(turboArgs) {
  return spawn('turbo', turboArgs, {
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}

/**
 * Wait for the child process to exit
 * @param {import('node:child_process').ChildProcess} child - Child process
 * @returns {Promise<number>} Exit code (1 when terminated by a signal)
 */
function waitForExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve(child.exitCode ?? 1)
  }

  return new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => resolve(code ?? 1))
  })
}

const initialBuild = await waitForExit(
  turbo(['build', PACKAGES_FILTER, '--output-logs=errors-only', '--ui=stream']),
)

if (initialBuild !== 0) {
  process.exit(initialBuild)
}

const children = [
  turbo([
    'watch',
    'build',
    PACKAGES_FILTER,
    '--output-logs=errors-only',
    '--ui=stream',
  ]),
  // `dev` is not cached, so the environment is passed as is (loose mode)
  // instead of limiting it to the variables listed in `turbo.json`.
  turbo([
    'dev',
    ...(hasFilter ? [] : [APPS_FILTER]),
    '--env-mode=loose',
    '--ui=stream',
    ...args,
  ]),
]

// The `turbo` wrapper forwards only SIGTERM to the turbo binary (SIGINT is
// expected to reach the whole process group from the terminal), so stop the
// children with SIGTERM even when this script receives SIGINT alone.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    for (const child of children) {
      child.kill('SIGTERM')
    }
  })
}

// When either process exits, stop the other one too.
const exitCode = await Promise.race(children.map(waitForExit))

for (const child of children) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill('SIGTERM')
  }
}

await Promise.all(children.map(waitForExit))

process.exit(exitCode)
