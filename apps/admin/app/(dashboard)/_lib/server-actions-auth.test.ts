// @vitest-environment node
import { globSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * 未認証のリクエストで mutation 系 Server Action が更新処理を行わず、
 * 共通の未認証レスポンスを返すことを確認する。
 *
 * 対象は、ダッシュボードの `_actions/` にあるモジュールが公開している関数の
 * すべて。`_actions/` にアクションを足せば、このテストの対象になる。
 */

import { unauthenticatedFormState, unauthenticatedResult } from '@/lib/auth'
import { setupActionTest } from '@/test/action-harness'

const test = setupActionTest()
const { supabase } = test

/** `apps/admin` */
const APP_ROOT = fileURLToPath(new URL('../../../', import.meta.url))

/**
 * `_actions/` の外にある、`'use server'` で始まるファイル（`apps/admin` から
 * のパス）。アクションを `_actions/` に移したら、この一覧から消す。
 */
const FILES_OUTSIDE_ACTIONS = [
  // ログインの前後に呼ぶため、認証を確かめないアクション（#7010 で移す）
  'app/login/_lib/actions.ts',
  'lib/actions/sign-out.ts',
]

/**
 * `eager: true` にすると、Vite がモジュールの先頭に `import` を足し、
 * `@/test/action-harness` の `vi.mock()` より先にアクションを読み込んでしまう。
 * そのため、モックを登録したあとで読み込む。
 */
const actionModules = import.meta.glob<Record<string, unknown>>([
  '../**/_actions/*.ts',
  '!../**/_actions/*.test.ts',
])

const actions: [string, (...args: unknown[]) => Promise<unknown>][] = []

for (const [path, load] of Object.entries(actionModules)) {
  for (const [name, value] of Object.entries(await load())) {
    if (typeof value === 'function') {
      actions.push([
        `${path}#${name}`,
        value as (...args: unknown[]) => Promise<unknown>,
      ])
    }
  }
}

const ID = '00000000-0000-4000-8000-000000000000'

/**
 * アクションに渡す引数。未認証なら、引数を見る前に返るので、どの引数でも
 * 同じ結果になるはず。`(prevState, formData)`、`(id, id)`、`(ids)` の形を試す。
 */
const argumentSets: [string, () => unknown[]][] = [
  ['an empty FormData', () => [{}, new FormData()]],
  ['IDs', () => [ID, ID]],
  ['an array of IDs', () => [[ID]]],
]

const cases = actions.flatMap(([name, action]) =>
  argumentSets.map(
    ([argumentsName, args]) => [name, argumentsName, action, args] as const,
  ),
)

function expectNoSideEffects() {
  expect(test.createSupabaseServerClient).not.toHaveBeenCalled()
  // No PostgREST request at all, through either client
  expect(supabase.requests).toEqual([])
  expect(test.getRedisClient).not.toHaveBeenCalled()
  test.expectNoAuditLog()
  test.expectNotRevalidated()
}

describe('mutation Server Actions without an authenticated user', () => {
  beforeEach(() => {
    test.signOut()
  })

  it('collects the actions', () => {
    expect(actions.length).toBeGreaterThan(0)
  })

  it.each(cases)(
    '%s returns an unauthenticated response with %s',
    async (_name, _argumentsName, action, args) => {
      const result = await action(...args())

      expect([
        unauthenticatedResult(),
        unauthenticatedFormState(),
      ]).toContainEqual(result)
      expect(test.requireAuthenticatedUser).toHaveBeenCalledOnce()
      expectNoSideEffects()
    },
  )
})

describe('files that start with "use server"', () => {
  it('are in `_actions/`', () => {
    const files = globSync('**/*.{ts,tsx}', {
      cwd: APP_ROOT,
      exclude: (path) => path === 'node_modules' || path === '.next',
    }).filter(
      (path) =>
        !path.split('/').includes('_actions') &&
        /^\s*['"]use server['"]/.test(
          readFileSync(`${APP_ROOT}${path}`, 'utf8'),
        ),
    )

    expect(files.sort()).toEqual([...FILES_OUTSIDE_ACTIONS].sort())
  })
})
