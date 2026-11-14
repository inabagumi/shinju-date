import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnalyticsSearchParams } from '../../../_lib/search-params-schema'

const mocks = vi.hoisted(() => ({
  getRepeatSearchRate: vi.fn(),
  getSearchEngagementRate: vi.fn(),
}))

vi.mock('@/lib/analytics/get-search-quality-metrics', () => ({
  getRepeatSearchRate: mocks.getRepeatSearchRate,
  getSearchEngagementRate: mocks.getSearchEngagementRate,
}))

const { RepeatSearchRateWidget } = await import('../repeat-search-rate-widget')
const { SearchEngagementRateWidget } = await import(
  '../search-engagement-rate-widget'
)

function createSearchParams(): Promise<AnalyticsSearchParams> {
  return Promise.resolve({
    dateRange: { endDate: '2026-11-14', startDate: '2026-11-08' },
    selectedDate: null,
    tab: null,
  })
}

describe('SearchEngagementRateWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "no data" without a rating when there is no session', async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(null)

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() }),
    )

    expect(screen.getByText('データなし')).toBeInTheDocument()
    expect(screen.queryByText(/0\.0%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/改善が必要\)/)).not.toBeInTheDocument()
  })

  it('shows the rate with its rating when there is data', async () => {
    mocks.getSearchEngagementRate.mockResolvedValue(25)

    render(
      await SearchEngagementRateWidget({ searchParams: createSearchParams() }),
    )

    expect(screen.getByText('25.0%')).toBeInTheDocument()
    expect(screen.getByText('検索利用率 (良好)')).toBeInTheDocument()
    expect(screen.queryByText('データなし')).not.toBeInTheDocument()
  })
})

describe('RepeatSearchRateWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "no data" without an interpretation when nobody searched', async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(null)

    render(await RepeatSearchRateWidget({ searchParams: createSearchParams() }))

    expect(screen.getByText('データなし')).toBeInTheDocument()
    expect(screen.queryByText('解釈:')).not.toBeInTheDocument()
    expect(screen.queryByText(/低い活動\)/)).not.toBeInTheDocument()
  })

  it('shows the rate with its interpretation when there is data', async () => {
    mocks.getRepeatSearchRate.mockResolvedValue(2.5)

    render(await RepeatSearchRateWidget({ searchParams: createSearchParams() }))

    expect(screen.getByText('2.5')).toBeInTheDocument()
    expect(
      screen.getByText('回/セッション (適度なエンゲージメント)'),
    ).toBeInTheDocument()
    expect(screen.getByText('解釈:')).toBeInTheDocument()
  })
})
