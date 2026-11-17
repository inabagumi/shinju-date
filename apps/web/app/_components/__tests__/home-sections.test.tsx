import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { Video } from '@/lib/fetchers'
import { queryKeys } from '@/lib/query-keys'
import {
  type DashboardVideos,
  LiveSection,
  RecentSection,
  ScheduleSection,
  ShortsSection,
} from '../home-sections'

vi.mock('@/lib/fetchers', () => ({
  fetchDashboardVideos: vi.fn(() => new Promise(() => {})),
  fetchUpcomingVideos: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../shorts-carousel', () => ({
  default: ({ videos }: { videos: Video[] }) => (
    <ul aria-label="carousel">
      {videos.map((video) => (
        <li key={video.id}>{video.id}</li>
      ))}
    </ul>
  ),
  ShortsCarouselSkeleton: () => null,
}))

vi.mock('../timeline', () => ({
  default: ({ videos }: { videos: Video[] }) => (
    <ol aria-label="timeline">
      {videos.map((video) => (
        <li key={video.id}>{video.id}</li>
      ))}
    </ol>
  ),
  TimelineSkeleton: () => null,
}))

vi.mock('@/components/video-card', () => ({
  default: ({ value }: { value: Video }) => <article>{value.id}</article>,
  VideoCardSkeleton: () => null,
}))

function createVideos(count: number, prefix: string): Video[] {
  return Array.from(
    { length: count },
    (_, index) => ({ id: `${prefix}-${index}` }) as Video,
  )
}

function createDashboardVideos(
  counts: Partial<Record<keyof DashboardVideos, number>> = {},
): DashboardVideos {
  return {
    live: createVideos(counts.live ?? 0, 'live'),
    recent: createVideos(counts.recent ?? 0, 'recent'),
    shorts: createVideos(counts.shorts ?? 0, 'shorts'),
  }
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const { container } = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  )

  return { container, queryClient }
}

describe('LiveSection', () => {
  test('should show the number of live videos next to the heading', () => {
    renderWithQueryClient(
      <LiveSection prefetchedData={createDashboardVideos({ live: 3 })} />,
    )

    const section = screen.getByRole('region', { name: '配信中' })

    expect(
      within(section).getByRole('heading', { level: 2, name: '配信中' }),
    ).toBeInTheDocument()
    expect(within(section).getByText('3件')).toBeInTheDocument()
    expect(within(section).getAllByRole('article')).toHaveLength(3)
  })

  test('should not render the section when nothing is live', () => {
    const { container } = renderWithQueryClient(
      <LiveSection prefetchedData={createDashboardVideos({ recent: 2 })} />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  test('should update when the query data is refreshed', async () => {
    const { container, queryClient } = renderWithQueryClient(
      <LiveSection prefetchedData={createDashboardVideos({ live: 1 })} />,
    )

    act(() => {
      queryClient.setQueryData(
        queryKeys.dashboardVideos(),
        createDashboardVideos({ live: 2 }),
      )
    })

    expect(await screen.findByText('2件')).toBeInTheDocument()

    act(() => {
      queryClient.setQueryData(
        queryKeys.dashboardVideos(),
        createDashboardVideos(),
      )
    })

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement()
    })
  })
})

describe('ScheduleSection', () => {
  test('should show the timeline with the number of upcoming videos', () => {
    renderWithQueryClient(
      <ScheduleSection
        prefetchedData={{
          today: '2026-11-14',
          videos: createVideos(5, 'upcoming'),
        }}
      />,
    )

    const section = screen.getByRole('region', { name: '配信予定' })

    expect(within(section).getByText('5件')).toBeInTheDocument()
    expect(
      within(within(section).getByRole('list', { name: 'timeline' }))
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'upcoming-0',
      'upcoming-1',
      'upcoming-2',
      'upcoming-3',
      'upcoming-4',
    ])
  })

  test('should show a message when nothing is scheduled', () => {
    renderWithQueryClient(
      <ScheduleSection prefetchedData={{ today: '2026-11-14', videos: [] }} />,
    )

    const section = screen.getByRole('region', { name: '配信予定' })

    expect(
      within(section).getByText('現在、予定されている配信はありません'),
    ).toBeInTheDocument()
    expect(within(section).queryByRole('list')).not.toBeInTheDocument()
  })
})

describe('RecentSection', () => {
  test('should show only one row of recent videos and link to the videos page', () => {
    renderWithQueryClient(
      <RecentSection prefetchedData={createDashboardVideos({ recent: 10 })} />,
    )

    const section = screen.getByRole('region', { name: '新着動画' })

    expect(
      within(section)
        .getAllByRole('article')
        .map((card) => card.textContent),
    ).toEqual(['recent-0', 'recent-1', 'recent-2', 'recent-3'])
    expect(
      within(section).getByRole('link', { name: '動画一覧を見る' }),
    ).toHaveAttribute('href', '/videos')
  })
})

describe('ShortsSection', () => {
  test('should show the shorts carousel with the number of shorts', () => {
    renderWithQueryClient(
      <ShortsSection prefetchedData={createDashboardVideos({ shorts: 20 })} />,
    )

    const section = screen.getByRole('region', { name: 'ショート' })

    expect(within(section).getByText('20件')).toBeInTheDocument()
    expect(
      within(section).getByRole('list', { name: 'carousel' }),
    ).toBeInTheDocument()
  })

  test('should not render the section when there are no shorts', () => {
    const { container } = renderWithQueryClient(
      <ShortsSection prefetchedData={createDashboardVideos({ live: 1 })} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
