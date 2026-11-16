import { describe, expect, it } from 'vitest'
import { diffVideoFields } from '../video-fields.js'

describe('diffVideoFields', () => {
  it('lists only the fields that changed, with their value on each side', () => {
    expect(
      diffVideoFields(
        { duration: 'PT1H', status: 'LIVE', title: 'Same' },
        { duration: 'PT2H', status: 'ENDED', title: 'Same' },
      ),
    ).toEqual({
      after: { duration: 'PT2H', status: 'ENDED' },
      before: { duration: 'PT1H', status: 'LIVE' },
    })
  })

  it('treats the same instant written differently as unchanged', () => {
    expect(
      diffVideoFields(
        { published_at: '2024-05-01T09:00:00+00:00' },
        { published_at: '2024-05-01T09:00:00Z' },
      ),
    ).toEqual({ after: {}, before: {} })
  })

  it('skips fields that are missing on either side', () => {
    expect(
      diffVideoFields({ title: 'Before' }, { video_kind: 'short' }),
    ).toEqual({ after: {}, before: {} })
  })
})
