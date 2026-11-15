import { describe, expect, it } from 'vitest'
import { isFeatureRequestStatus } from './feature-request-status'

describe('isFeatureRequestStatus', () => {
  it.each(['pending', 'in_progress', 'resolved', 'rejected'])(
    'accepts %s',
    (value) => {
      expect(isFeatureRequestStatus(value)).toBe(true)
    },
  )

  it.each([
    ['an unknown status', 'done'],
    ['an empty string', ''],
    ['a differently cased status', 'PENDING'],
    ['null', null],
    ['a File', new File([], 'status')],
  ])('rejects %s', (_label, value) => {
    expect(isFeatureRequestStatus(value)).toBe(false)
  })
})
