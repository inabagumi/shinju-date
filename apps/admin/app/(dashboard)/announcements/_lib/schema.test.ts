import { describe, expect, it } from 'vitest'
import {
  ANNOUNCEMENT_LEVELS,
  announcementSchema,
  updateAnnouncementSchema,
} from './schema'

const START_AT = '2026-01-01T00:00:00Z'
const END_AT = '2026-01-08T00:00:00Z'

const VALID_INPUT = {
  end_at: END_AT,
  message: 'メンテナンスのお知らせ',
  start_at: START_AT,
}

describe('announcementSchema', () => {
  it('trims the message and parses the period into instants', () => {
    const result = announcementSchema.parse({
      ...VALID_INPUT,
      message: '  メンテナンスのお知らせ  ',
    })

    expect(result).toEqual({
      enabled: false,
      end_at: Temporal.Instant.from(END_AT),
      level: 'info',
      message: 'メンテナンスのお知らせ',
      start_at: Temporal.Instant.from(START_AT),
    })
  })

  it('reads the period with an offset', () => {
    const result = announcementSchema.parse({
      ...VALID_INPUT,
      start_at: '2026-01-01T09:00:00+09:00',
    })

    expect(result.start_at.equals(Temporal.Instant.from(START_AT))).toBe(true)
  })

  it.each([
    ['true', true],
    ['false', false],
    ['on', false],
  ])('reads enabled %j as %j', (enabled, expected) => {
    expect(announcementSchema.parse({ ...VALID_INPUT, enabled }).enabled).toBe(
      expected,
    )
  })

  it.each(ANNOUNCEMENT_LEVELS)('accepts the level %j', (level) => {
    expect(announcementSchema.parse({ ...VALID_INPUT, level }).level).toBe(
      level,
    )
  })

  it.each([[''], ['danger'], ['INFO']])('rejects the level %j', (level) => {
    const result = announcementSchema.safeParse({ ...VALID_INPUT, level })

    expect(result.error?.issues).toMatchObject([
      { message: 'レベルを選択してください。', path: ['level'] },
    ])
  })

  it.each([[''], ['   '], [undefined]])(
    'requires the message for %j',
    (message) => {
      const result = announcementSchema.safeParse({ ...VALID_INPUT, message })

      expect(result.error?.issues).toMatchObject([
        {
          message: 'お知らせメッセージを入力してください。',
          path: ['message'],
        },
      ])
    },
  )

  it.each([
    ['start_at', ''],
    ['start_at', undefined],
    ['end_at', '  '],
    ['end_at', undefined],
  ])('requires %s (%j)', (key, value) => {
    const result = announcementSchema.safeParse({
      ...VALID_INPUT,
      [key]: value,
    })

    expect(result.error?.issues).toMatchObject([
      { message: '開始日時と終了日時を入力してください。', path: [key] },
    ])
  })

  it.each([
    ['start_at', '2026-01-01'],
    ['end_at', 'not a date'],
  ])('rejects %s in a wrong format (%j)', (key, value) => {
    const result = announcementSchema.safeParse({
      ...VALID_INPUT,
      [key]: value,
    })

    expect(result.error?.issues).toMatchObject([
      { message: '日時の形式が正しくありません。', path: [key] },
    ])
  })

  it.each([
    ['before', { end_at: START_AT, start_at: END_AT }],
    ['equal to', { end_at: START_AT, start_at: START_AT }],
  ])('rejects the end %s the start', (_label, period) => {
    const result = announcementSchema.safeParse({ ...VALID_INPUT, ...period })

    expect(result.error?.issues).toMatchObject([
      {
        message: '終了日時は開始日時より後に設定してください。',
        path: ['end_at'],
      },
    ])
  })
})

describe('updateAnnouncementSchema', () => {
  it('adds the ID', () => {
    expect(
      updateAnnouncementSchema.parse({ ...VALID_INPUT, id: 'announcement-1' })
        .id,
    ).toBe('announcement-1')
  })

  it('keeps the check of the period', () => {
    const result = updateAnnouncementSchema.safeParse({
      ...VALID_INPUT,
      end_at: START_AT,
      id: 'announcement-1',
      start_at: END_AT,
    })

    expect(result.error?.issues).toMatchObject([
      { message: '終了日時は開始日時より後に設定してください。' },
    ])
  })

  it.each([[''], [undefined]])('requires the ID for %j', (id) => {
    const result = updateAnnouncementSchema.safeParse({ ...VALID_INPUT, id })

    expect(result.error?.issues).toMatchObject([
      { message: 'IDが指定されていません。', path: ['id'] },
    ])
  })
})
