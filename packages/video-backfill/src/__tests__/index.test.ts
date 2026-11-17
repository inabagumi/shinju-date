import { describe, expect, it } from 'vitest'
import { getBackfillJobId, getBackfillRunJobStatus } from '../index.js'

describe('getBackfillJobId', () => {
  it('identifies a job by platform and account', () => {
    expect(getBackfillJobId('youtube', 'channel-row-1')).toBe(
      'youtube:channel-row-1',
    )
  })
})

describe('getBackfillRunJobStatus', () => {
  it('shows an unfinished job that is not active as interrupted', () => {
    expect(getBackfillRunJobStatus('pending', false)).toBe('interrupted')
    expect(getBackfillRunJobStatus('running', false)).toBe('interrupted')
  })

  it('keeps the status of an active job', () => {
    expect(getBackfillRunJobStatus('pending', true)).toBe('pending')
    expect(getBackfillRunJobStatus('running', true)).toBe('running')
  })

  it('keeps the status of a job that finished', () => {
    expect(getBackfillRunJobStatus('done', false)).toBe('done')
    expect(getBackfillRunJobStatus('failed', false)).toBe('failed')
  })
})
