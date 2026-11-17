import { CACHE_TAGS, REDIS_KEYS } from '@shinju-date/constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setupActionTest } from '@/test/action-harness'
import { addQueryAction, deleteQueryAction } from '../index'

const test = setupActionTest()

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
  it('should return error when query is empty', async () => {
    const result = await addQueryAction('   ')

    expect(result).toEqual({
      error: 'クエリを入力してください。',
      success: false,
    })
    expect(redisClient.sadd).not.toHaveBeenCalled()
    test.expectNotRevalidated()
  })

  it('should add the trimmed query and revalidate the recommendation queries', async () => {
    const result = await addQueryAction('  Hoge  ')

    expect(result).toEqual({ success: true })
    expect(redisClient.sadd).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      'Hoge',
    )
    test.expectAuditLog(
      'RECOMMENDED_QUERY_CREATE',
      'redis:recommended_queries',
      null,
      { entityName: 'Hoge' },
    )
    expect(test.revalidateTags).toHaveBeenCalledTimes(1)
    expect(test.revalidateTags).toHaveBeenCalledWith([
      CACHE_TAGS.RECOMMENDATION_QUERIES,
    ])
  })

  it('should return error when Redis fails', async () => {
    redisClient.sadd.mockRejectedValue(new Error('Redis error'))

    const result = await addQueryAction('Hoge')

    expect(result).toEqual({ error: 'Redis error', success: false })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})

describe('deleteQueryAction', () => {
  it('should return error when query is empty', async () => {
    const result = await deleteQueryAction('')

    expect(result).toEqual({
      error: 'クエリが指定されていません。',
      success: false,
    })
    expect(redisClient.srem).not.toHaveBeenCalled()
    test.expectNotRevalidated()
  })

  it('should delete the query and revalidate the recommendation queries', async () => {
    const result = await deleteQueryAction('Hoge')

    expect(result).toEqual({ success: true })
    expect(redisClient.srem).toHaveBeenCalledWith(
      REDIS_KEYS.QUERIES_MANUAL_RECOMMENDED,
      'Hoge',
    )
    test.expectAuditLog(
      'RECOMMENDED_QUERY_DELETE',
      'redis:recommended_queries',
      null,
      { entityName: 'Hoge' },
    )
    expect(test.revalidateTags).toHaveBeenCalledTimes(1)
    expect(test.revalidateTags).toHaveBeenCalledWith([
      CACHE_TAGS.RECOMMENDATION_QUERIES,
    ])
  })

  it('should return error when Redis fails', async () => {
    redisClient.srem.mockRejectedValue(new Error('Redis error'))

    const result = await deleteQueryAction('Hoge')

    expect(result).toEqual({ error: 'Redis error', success: false })
    test.expectNoAuditLog()
    test.expectNotRevalidated()
  })
})
