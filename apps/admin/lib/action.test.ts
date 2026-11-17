import { describe, expect, it } from 'vitest'
import { ActionError } from './action'

describe('ActionError', () => {
  it('keeps the message that may be shown and the field it belongs to', () => {
    const error = new ActionError('すでに登録されています。', {
      field: 'youtube_channel_id',
    })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ActionError')
    expect(error.message).toBe('すでに登録されています。')
    expect(error.field).toBe('youtube_channel_id')
  })

  it('belongs to no field when none is given', () => {
    expect(new ActionError('失敗しました。').field).toBeUndefined()
  })
})
