/**
 * Tests for the GritQL plugins in `config/biome/`.
 *
 * Writes fixtures into temporary directories in the apps and the packages
 * (so that the nested `biome.json` of each app is used), runs `biome lint`,
 * and compares the lines that the plugins report. A fixture line that ends
 * with `// report` must be reported, and the other lines must not.
 *
 * Usage:
 *   node --test scripts/biome-plugins.test.mjs
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const biome = join(root, 'node_modules', '.bin', 'biome')

const TEMP_DIR_NAME = `__biome-plugins-test-${process.pid}__`
const TEMP_PARENTS = ['apps/admin', 'apps/web', 'packages/ui']

const PLUGIN_MESSAGES = {
  'no-default-tailwind-scale': 'Tailwind の既定の',
  'no-hardcoded-time-zone': 'タイムゾーンを直接書かず',
}

const REPORT_MARKER = '// report'

const TIME_ZONE_FIXTURE = `import { TIME_ZONE } from '@shinju-date/constants'

export const a = 'Asia/Tokyo' // report
export const b = "Asia/Tokyo" // report
export const c = \`Asia/Tokyo\` // report
export const d = \`\${TIME_ZONE}\`
export const e = '2026-01-01T00:00:00+09:00[Asia/Tokyo]' // report
export const f = <time data-time-zone="Asia/Tokyo" /> // report
export const g = Temporal.Now.zonedDateTimeISO(TIME_ZONE)
// Asia/Tokyo in a comment is not reported
export const h = 'Europe/London'
`

const TAILWIND_FIXTURE = `import { cva } from 'class-variance-authority'
import { twMerge } from '@shinju-date/ui'

export const a = <div className="text-sm rounded-md" /> // report
export const b = <div className="dark:bg-black" /> // report
export const c = <div class="shadow-lg" /> // report
export const d = <div className={'text-base'} /> // report
export const e = <div className={\`flex \${x} rounded-xl\`} /> // report
export const f = <div className={cond ? 'p-2' : 'hover:shadow-md'} /> // report
export const g = twMerge('flex', cond && 'sm:text-sm') // report
export const h = twMerge('text-lg/7') // report
export const i = twMerge('md:dark:text-white') // report
export const j = twMerge('rounded') // report
export const k = twMerge('shadow') // report
export const l = twMerge('rounded-t-lg') // report
export const m = twMerge('text-2xl') // report
export const n = twMerge('text-sm!') // report
export const o = twMerge('!text-sm') // report
export const p = cva('rounded-lg') // report
export const q = cva('p-2', {
  variants: {
    size: {
      md: 'p-4',
      sm: 'text-xs', // report
    },
  },
})
export const r = <div className="text-body rounded-control shadow-overlay" />
export const s = <div className="rounded-full rounded-none shadow-none" />
export const t = <div className="text-meta text-caption rounded-t-container" />
export const u = <div className="text-muted bg-surface hover:text-foreground" />
export const v = twMerge('text-title', cond && 'sm:text-display')
export const w = cva('rounded-container', { variants: { size: { sm: 'p-2' } } })
export const x = <div data-class="text-sm" title="dark:" />
export const y = 'text-sm rounded-md shadow-lg dark:bg-black'
export const z = format('text-sm')
`

/**
 * Lines (1-based) that end with the report marker.
 *
 * @param {string} source
 */
function expectedLines(source) {
  return source
    .split('\n')
    .flatMap((line, index) =>
      line.trimEnd().endsWith(REPORT_MARKER) ? [index + 1] : [],
    )
}

/**
 * Run `biome lint` and group the lines that each plugin reports by file.
 *
 * @param {string[]} paths - Paths relative to the repository root
 * @returns {Map<string, Map<string, number[]>>} plugin -> file -> lines
 */
function lint(paths) {
  const result = spawnSync(
    biome,
    ['lint', '--reporter=json', '--max-diagnostics=none', ...paths],
    { cwd: root, encoding: 'utf8' },
  )

  assert.ok(result.stdout, `biome did not print a report: ${result.stderr}`)

  const { diagnostics } = JSON.parse(result.stdout)
  /** @type {Map<string, Map<string, number[]>>} */
  const reports = new Map(
    Object.keys(PLUGIN_MESSAGES).map((plugin) => [plugin, new Map()]),
  )

  for (const diagnostic of diagnostics) {
    if (diagnostic.category !== 'plugin') {
      continue
    }

    const plugin = Object.keys(PLUGIN_MESSAGES).find((name) =>
      diagnostic.message.startsWith(PLUGIN_MESSAGES[name]),
    )

    assert.ok(plugin, `Unknown plugin diagnostic: ${diagnostic.message}`)

    const byFile = reports.get(plugin)
    const lines = byFile.get(diagnostic.location.path) ?? []

    lines.push(diagnostic.location.start.line)
    byFile.set(diagnostic.location.path, lines)
  }

  return reports
}

/**
 * @param {Map<string, Map<string, number[]>>} reports
 * @param {string} plugin
 * @param {string} file
 */
function reportedLines(reports, plugin, file) {
  return [...new Set(reports.get(plugin).get(file) ?? [])].sort((a, b) => a - b)
}

describe('Biome plugins', () => {
  /** @type {Map<string, string>} path -> source */
  const fixtures = new Map()
  /** @type {Map<string, Map<string, number[]>>} */
  let reports

  before(() => {
    for (const parent of TEMP_PARENTS) {
      const dir = join(parent, TEMP_DIR_NAME)

      fixtures.set(join(dir, 'time-zone.tsx'), TIME_ZONE_FIXTURE)
      fixtures.set(join(dir, 'tailwind.tsx'), TAILWIND_FIXTURE)
    }

    // Test files may write the time zone
    const testsDir = join('apps/web', TEMP_DIR_NAME, '__tests__')

    fixtures.set(join(testsDir, 'time-zone.tsx'), TIME_ZONE_FIXTURE)
    fixtures.set(
      join('apps/web', TEMP_DIR_NAME, 'time-zone.test.tsx'),
      TIME_ZONE_FIXTURE,
    )

    for (const [path, source] of fixtures) {
      mkdirSync(join(root, dirname(path)), { recursive: true })
      writeFileSync(join(root, path), source)
    }

    reports = lint([
      ...TEMP_PARENTS.map((parent) => join(parent, TEMP_DIR_NAME)),
      'packages/constants/src/index.ts',
      'packages/ui/src/tw-merge.test.ts',
    ])
  })

  after(() => {
    for (const parent of TEMP_PARENTS) {
      rmSync(join(root, parent, TEMP_DIR_NAME), {
        force: true,
        recursive: true,
      })
    }
  })

  describe('no-hardcoded-time-zone', () => {
    for (const parent of TEMP_PARENTS) {
      it(`reports the time zone written directly in ${parent}`, () => {
        const file = join(parent, TEMP_DIR_NAME, 'time-zone.tsx')

        assert.deepEqual(
          reportedLines(reports, 'no-hardcoded-time-zone', file),
          expectedLines(TIME_ZONE_FIXTURE),
        )
      })
    }

    it('does not report test files', () => {
      for (const file of [
        join('apps/web', TEMP_DIR_NAME, '__tests__', 'time-zone.tsx'),
        join('apps/web', TEMP_DIR_NAME, 'time-zone.test.tsx'),
      ]) {
        assert.deepEqual(
          reportedLines(reports, 'no-hardcoded-time-zone', file),
          [],
        )
      }
    })

    it('does not report the definition of TIME_ZONE', () => {
      const file = 'packages/constants/src/index.ts'

      assert.match(readFileSync(join(root, file), 'utf8'), /'Asia\/Tokyo'/)
      assert.deepEqual(
        reportedLines(reports, 'no-hardcoded-time-zone', file),
        [],
      )
    })
  })

  describe('no-default-tailwind-scale', () => {
    for (const parent of TEMP_PARENTS) {
      it(`reports the default scales and dark: in ${parent}`, () => {
        const file = join(parent, TEMP_DIR_NAME, 'tailwind.tsx')

        assert.deepEqual(
          reportedLines(reports, 'no-default-tailwind-scale', file),
          expectedLines(TAILWIND_FIXTURE),
        )
      })
    }

    it('does not report the tests of twMerge', () => {
      const file = 'packages/ui/src/tw-merge.test.ts'

      assert.match(readFileSync(join(root, file), 'utf8'), /'text-sm'/)
      assert.deepEqual(
        reportedLines(reports, 'no-default-tailwind-scale', file),
        [],
      )
    })
  })
})
