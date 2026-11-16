import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SummaryStatsWithTrends } from '../../_lib/get-summary-stats'

const mocks = vi.hoisted(() => ({
  getHistoricalStats: vi.fn(),
  getSummaryStats: vi.fn(),
}))

vi.mock('next/cache', () => ({
  cacheLife: vi.fn(),
}))
vi.mock('../../_lib/get-historical-stats', () => ({
  getHistoricalStats: mocks.getHistoricalStats,
}))
vi.mock('../../_lib/get-summary-stats', () => ({
  getSummaryStats: mocks.getSummaryStats,
}))
vi.mock('../video-stats-chart-ui', () => ({
  VideoStatsChartUI: () => null,
}))

const { VideoSummaryWidget } = await import('../summary-widget')

function trend(current: number) {
  return { current, dayChange: null, weekChange: null }
}

const stats: SummaryStatsWithTrends = {
  deletedVideos: trend(2),
  hiddenVideos: trend(1),
  scheduledVideos: trend(5),
  totalTalents: trend(0),
  totalTerms: trend(0),
  totalVideos: trend(31),
  visibleVideos: trend(25),
}

describe('VideoSummaryWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSummaryStats.mockResolvedValue(stats)
    mocks.getHistoricalStats.mockResolvedValue([])
  })

  it.each([
    ['総動画数', '/videos?deleted=false'],
    [
      '公開中',
      '/videos?deleted=false&visible=true&status=ENDED&status=LIVE&status=PUBLISHED',
    ],
    ['配信予定', '/videos?deleted=false&visible=true&status=UPCOMING'],
    ['非表示', '/videos?deleted=false&visible=false'],
  ])('links the tile of %s to the videos it counts', async (label, href) => {
    render(await VideoSummaryWidget())

    expect(
      screen
        .getByRole('link', { name: new RegExp(`^${label}`) })
        .getAttribute('href'),
    ).toBe(href)
  })
})
