import { describe, expect, it } from 'vitest'
import { DatabaseError, StorageError, throwIfError } from './errors.js'

describe('throwIfError', () => {
  it('returns data when the query succeeded', () => {
    expect(throwIfError({ data: [{ id: 'a' }], error: null }, 'Load')).toEqual([
      { id: 'a' },
    ])
  })

  it('returns null data of a query that selects nothing', () => {
    expect(throwIfError({ data: null, error: null }, 'Update')).toBeNull()
  })

  it('throws DatabaseError with the operation when the query failed', () => {
    const cause = { code: '42501', message: 'permission denied' }

    let thrown: unknown
    try {
      throwIfError({ data: null, error: cause }, 'Failed to load videos')
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(DatabaseError)
    expect(thrown).toMatchObject({
      cause,
      message: 'Failed to load videos: permission denied',
      name: 'DatabaseError',
      operation: 'Failed to load videos',
    })
  })
})

describe('StorageError', () => {
  it('keeps the operation and the cause', () => {
    const cause = new Error('The resource already exists')
    const error = new StorageError('Failed to upload a thumbnail', cause)

    expect(error).toMatchObject({
      cause,
      message: 'Failed to upload a thumbnail: The resource already exists',
      name: 'StorageError',
      operation: 'Failed to upload a thumbnail',
    })
  })
})
