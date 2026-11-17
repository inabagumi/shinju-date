import { describe, expect, it } from 'vitest'
import {
  describeRatings,
  ENGAGEMENT_RATE_RATINGS,
  EXIT_RATE_RATINGS,
  type Ratings,
  REPEAT_SEARCH_RATE_RATINGS,
  rate,
} from '../metric-ratings'

describe('rate', () => {
  it.each([
    [0, '良好', 'success'],
    [29.9, '良好', 'success'],
    [30, '普通', 'neutral'],
    [49.9, '普通', 'neutral'],
    [50, '注意', 'warning'],
    [69.9, '注意', 'warning'],
    [70, '要改善', 'danger'],
    [100, '要改善', 'danger'],
  ] as const)(
    'rates an exit rate of %d%% as %s (%s)',
    (value, label, variant) => {
      expect(rate(value, EXIT_RATE_RATINGS)).toMatchObject({ label, variant })
    },
  )

  it.each([
    [0, '改善が必要'],
    [9.9, '改善が必要'],
    [10, '平均的'],
    [19.9, '平均的'],
    [20, '良好'],
    [29.9, '良好'],
    [30, '優秀'],
    [100, '優秀'],
  ] as const)('rates an engagement rate of %d%% as %s', (value, label) => {
    expect(rate(value, ENGAGEMENT_RATE_RATINGS).label).toBe(label)
  })

  it.each([
    [0, '低い活動'],
    [1.4, '低い活動'],
    [1.5, '標準的'],
    [1.9, '標準的'],
    [2, '適度なエンゲージメント'],
    [2.9, '適度なエンゲージメント'],
    [3, '高いエンゲージメント'],
    [10, '高いエンゲージメント'],
  ] as const)('rates %d searches per session as %s', (value, label) => {
    expect(rate(value, REPEAT_SEARCH_RATE_RATINGS).label).toBe(label)
  })

  it('falls back to the lowest row for a value below every threshold', () => {
    expect(rate(-1, EXIT_RATE_RATINGS).label).toBe('良好')
    expect(rate(Number.NaN, EXIT_RATE_RATINGS).label).toBe('良好')
  })
})

describe('describeRatings', () => {
  it('describes the exit rate from the best to the worst', () => {
    expect(
      describeRatings(EXIT_RATE_RATINGS, { order: 'ascending', unit: '%' }),
    ).toEqual([
      '30%未満: 良好',
      '30-49%: 普通',
      '50-69%: 注意',
      '70%以上: 要改善',
    ])
  })

  it('describes the engagement rate in the order of the table', () => {
    expect(describeRatings(ENGAGEMENT_RATE_RATINGS, { unit: '%' })).toEqual([
      '30%以上: 優秀',
      '20-29%: 良好',
      '10-19%: 平均的',
      '10%未満: 改善が必要',
    ])
  })

  it('describes the repeat search rate with one fraction digit', () => {
    expect(
      describeRatings(REPEAT_SEARCH_RATE_RATINGS, {
        fractionDigits: 1,
        unit: '回',
      }),
    ).toEqual([
      '3.0回以上: 高いエンゲージメント',
      '2.0-2.9回: 適度なエンゲージメント',
      '1.5-1.9回: 標準的',
      '1.5回未満: 低い活動',
    ])
  })
})

describe('a changed threshold', () => {
  const ratings = [
    { label: '要改善', min: 70 },
    { label: '注意', min: 50 },
    // 30 から 40 に変える
    { label: '普通', min: 40 },
    { label: '良好', min: 0 },
  ] as const satisfies Ratings

  it('moves the boundary of the rating', () => {
    expect(rate(35, EXIT_RATE_RATINGS).label).toBe('普通')
    expect(rate(35, ratings).label).toBe('良好')
    expect(rate(40, ratings).label).toBe('普通')
  })

  it('moves the boundary in the legend', () => {
    expect(describeRatings(ratings, { order: 'ascending', unit: '%' })).toEqual(
      ['40%未満: 良好', '40-49%: 普通', '50-69%: 注意', '70%以上: 要改善'],
    )
  })
})
