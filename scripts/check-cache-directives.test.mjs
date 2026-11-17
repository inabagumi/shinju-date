/**
 * Tests for `scripts/check-cache-directives.mjs`.
 *
 * Usage:
 *   node --test scripts/check-cache-directives.test.mjs
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findMissingBlankLines } from './check-cache-directives.mjs'

/**
 * @param {string} source
 * @param {string} [fileName]
 */
function lines(source, fileName = 'fixture.ts') {
  return findMissingBlankLines(source, fileName).map(({ line }) => line)
}

describe('findMissingBlankLines', () => {
  it('accepts blank lines after the directive and the cache functions', () => {
    const source = `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')

  return await fetchTalent()
}
`

    assert.deepEqual(lines(source), [])
  })

  it('reports a statement right after the directive', () => {
    const source = `export async function getTalent() {
  'use cache'
  return await fetchTalent()
}
`

    assert.deepEqual(lines(source), [3])
  })

  it('reports the cache functions right after the directive', () => {
    const source = `export async function getTalent() {
  'use cache: private'
  cacheLife('minutes')

  return await fetchTalent()
}
`

    assert.deepEqual(lines(source), [3])
  })

  it('reports a statement right after the cache functions', () => {
    const source = `export async function getTalent() {
  'use cache: remote'

  cacheLife('hours')
  cacheTag('talents')
  return await fetchTalent()
}
`

    assert.deepEqual(lines(source), [6])
  })

  it('reports a comment that is not separated by a blank line', () => {
    const source = `export async function getTalent() {
  'use cache: remote'
  // Cached for an hour
  cacheLife('hours')

  return await fetchTalent()
}
`

    assert.deepEqual(lines(source), [4])
  })

  it('accepts the directive and the cache functions at the end of a block', () => {
    const source = `export async function warm() {
  'use cache'
}

export async function tag(id) {
  cacheTag(id)
}
`

    assert.deepEqual(lines(source, 'fixture.js'), [])
  })

  it('checks the directive at the top of a file', () => {
    const source = `'use cache'
export async function getTalent() {}
`

    assert.deepEqual(lines(source), [2])
  })

  it('checks arrow functions, methods and nested blocks in TSX', () => {
    const source = `const getTalent = async () => {
  'use cache: remote'
  return <div />
}

class Repository {
  async find() {
    'use cache'

    if (cond) {
      cacheTag('talents')
      return <div />
    }
  }
}
`

    assert.deepEqual(lines(source, 'fixture.tsx'), [3, 12])
  })

  it('ignores other directives and other functions', () => {
    const source = `'use client'
import { useState } from 'react'

export async function getTalent() {
  'use server'
  revalidateTag('talents')
  return 'use cache'
}
`

    assert.deepEqual(lines(source), [])
  })
})
