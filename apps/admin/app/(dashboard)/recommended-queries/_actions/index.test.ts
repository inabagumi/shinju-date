import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { addQueryAction, deleteQueryAction } from './index'

const test = setupActionTest()

/**
 * 予期しない例外のときに画面に出る文（`@/lib/action` の `ACTION_FAILED_ERROR_MESSAGE`）。
 * `@/lib/action` を読み込むと、認証のモックより先に `@/lib/auth` が読み込まれるため、
 * ここに書く
 */
const ACTION_FAILED_ERROR =
  '処理に失敗しました。時間をおいて、もう一度お試しください。'

/** 引数の検証に失敗したときの文（`@/lib/schemas` の `INVALID_INPUT_ERROR_MESSAGE`） */
const INVALID_INPUT_ERROR = '入力が正しくありません。'

const redisClient = {
  sadd: vi.fn(async () => 1),
  srem: vi.fn(async () => 1),
}

beforeEach(() => {
  redisClient.sadd.mockImplementation(async () => 1)
  redisClient.srem.mockImplementation(async () => 1)
  test.getRedisClient.mockImplementation(() => redisClient)
})

describe('addQueryAction', () => {
  it.each([
    ['an empty query', ''],
    ['a query of only spaces', '   '],
    ['a query longer than 100 characters', 'a'.repeat(101)],
    ['a value that is not a string', 1],
  ])('should return error without adding anything for %s', async (_, query) => {
    const result = await addQueryAction(query as string)

    expect(result).toEqual({ error: INVALID_INPUT_ERROR, success: false })
    expect(redisClient.sadd).not.toHaveBeenCalled()
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })

  it('should accept a query of 100 characters without the spaces around it', async () => {
    const query = 'a'.repeat(100)

    const result = await addQueryAction(`  ${query}  `)

    expect(result).toEqual({ success: true })
    expect(redisClient.sadd).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      query,
    )
  })

  it('should add the trimmed query and revalidate the recommendation queries', async () => {
    const result = await addQueryAction('  Hoge  ')

    expect(result).toEqual({ success: true })
    expect(redisClient.sadd).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      'Hoge',
    )
    test.expectAuditLog('RECOMMENDED_QUERY_CREATE', null, {
      entityName: 'Hoge',
    })
    expect(test.revalidateTags).toHaveBeenCalledTimes(1)
    expect(test.revalidateTags).toHaveBeenCalledWith([
      CACHE_TAGS.RECOMMENDATION_QUERIES,
    ])
  })

  it('should return error when Redis fails', async () => {
    redisClient.sadd.mockRejectedValue(new Error('Redis error'))

    const result = await addQueryAction('Hoge')

    expect(result).toEqual({ error: ACTION_FAILED_ERROR, success: false })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('deleteQueryAction', () => {
  it.each([
    ['an empty query', ''],
    ['a query of only spaces', '   '],
    ['a query longer than 100 characters', 'a'.repeat(101)],
    ['a value that is not a string', null],
  ])(
    'should return error without deleting anything for %s',
    async (_, query) => {
      const result = await deleteQueryAction(query as string)

      expect(result).toEqual({ error: INVALID_INPUT_ERROR, success: false })
      expect(redisClient.srem).not.toHaveBeenCalled()
      test.expectNoAuditLog()
      test.expectNotRevalidated()
    },
  )

  it('should delete the query and revalidate the recommendation queries', async () => {
    const result = await deleteQueryAction('Hoge')

    expect(result).toEqual({ success: true })
    expect(redisClient.srem).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      'Hoge',
    )
    test.expectAuditLog('RECOMMENDED_QUERY_DELETE', null, {
      entityName: 'Hoge',
    })
    expect(test.revalidateTags).toHaveBeenCalledTimes(1)
    expect(test.revalidateTags).toHaveBeenCalledWith([
      CACHE_TAGS.RECOMMENDATION_QUERIES,
    ])
  })

  it('should return error when Redis fails', async () => {
    redisClient.srem.mockRejectedValue(new Error('Redis error'))

    const result = await deleteQueryAction('Hoge')

    expect(result).toEqual({ error: ACTION_FAILED_ERROR, success: false })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})
