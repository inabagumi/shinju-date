/**
 * Tests for `scripts/check-package-exports.mjs`.
 *
 * Usage:
 *   node --test scripts/check-package-exports.test.mjs
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findExportsProblems } from './check-package-exports.mjs'

const always = () => true

/**
 * Build an `exports` entry whose conditions keep the given order (Biome sorts
 * the keys of object literals, and the order is what the check looks at).
 * @param {[string, string][]} conditions
 */
function entry(...conditions) {
  return Object.fromEntries(conditions)
}

/** @param {string} name */
function typesAndDefault(name) {
  return entry(
    ['types', `./dist/${name}.d.ts`],
    ['default', `./dist/${name}.js`],
  )
}

describe('findExportsProblems', () => {
  it('accepts entries with `types` and `default`', () => {
    const pkg = {
      exports: {
        '.': typesAndDefault('index'),
        './server': typesAndDefault('server'),
      },
    }

    assert.deepEqual(findExportsProblems(pkg, always), [])
  })

  it('accepts a path without conditions for a file that is not JavaScript', () => {
    const pkg = { exports: { './theme.css': './theme.css' } }

    assert.deepEqual(findExportsProblems(pkg, always), [])
  })

  it('reports a package without `exports`', () => {
    const pkg = { main: './dist/index.js', types: './dist/index.d.ts' }

    assert.equal(findExportsProblems(pkg, always).length, 3)
  })

  it('reports `types` after `default`', () => {
    const pkg = {
      exports: {
        '.': entry(
          ['default', './dist/index.js'],
          ['types', './dist/index.d.ts'],
        ),
      },
    }

    assert.equal(findExportsProblems(pkg, always).length, 1)
  })

  it('reports `import` instead of `default`', () => {
    const pkg = {
      exports: {
        '.': entry(
          ['types', './dist/index.d.ts'],
          ['import', './dist/index.js'],
        ),
      },
    }

    assert.equal(findExportsProblems(pkg, always).length, 1)
  })

  it('reports an entry without `types`', () => {
    const pkg = {
      exports: { './register': entry(['default', './dist/register.js']) },
    }

    assert.equal(findExportsProblems(pkg, always).length, 1)
  })

  it('reports a JavaScript file without conditions', () => {
    const pkg = { exports: { '.': './dist/index.js' } }

    assert.equal(findExportsProblems(pkg, always).length, 1)
  })

  it('reports `typesVersions`', () => {
    const pkg = {
      exports: { '.': typesAndDefault('index') },
      typesVersions: { '*': { '*': ['./dist/*'] } },
    }

    assert.equal(findExportsProblems(pkg, always).length, 1)
  })

  it('reports the files that do not exist', () => {
    const pkg = { exports: { '.': typesAndDefault('index') } }
    const problems = findExportsProblems(
      pkg,
      (target) => target !== './dist/index.js',
    )

    assert.deepEqual(problems, [
      '"exports"["."] の ./dist/index.js がありません',
    ])
  })
})
