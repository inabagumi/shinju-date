import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Video } from '@/lib/fetchers'
import LiveAndRecent from '../live-and-recent'

const { fetchDashboardVideos } = vi.hoisted(() => ({
  fetchDashboardVideos: vi.fn(),
}))

vi.mock('@/lib/fetchers', () => ({
  fetchDashboardVideos,
}))

vi.mock('../video-card', () => ({
  default: ({ value }: { value: Video }) => <div>{value.title}</div>,
  VideoCardSkeleton: () => null,
}))

vi.mock('../shorts-carousel', () => ({
  default: ({ videos }: { videos: Video[] }) => (
    <div>{videos.map((video) => video.title).join(',')}</div>
  ),
}))

function createVideos(prefix: string, count: number): Video[] {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `${prefix}-${index}`,
        title: `${prefix} ${index}`,
      }) as Video,
  )
}

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  })

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
  }
}

describe('LiveAndRecent', () => {
  beforeEach(() => {
    fetchDashboardVideos.mockReset()
  })

  test('should show the number of videos next to each tab label', () => {
    renderWithClient(
      <LiveAndRecent
        prefetchedData={{
          live: createVideos('live', 2),
          recent: createVideos('recent', 10),
          shorts: createVideos('shorts', 20),
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: '配信中（2件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '新着動画（10件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ショート（20件）' }),
    ).toBeInTheDocument()
  })

  test('should show 0 and keep the tab disabled when there are no videos', () => {
    renderWithClient(
      <LiveAndRecent
        prefetchedData={{
          live: [],
          recent: createVideos('recent', 3),
          shorts: [],
        }}
      />,
    )

    const liveTab = screen.getByRole('button', { name: '配信中（0件）' })
    const shortsTab = screen.getByRole('button', { name: 'ショート（0件）' })

    expect(liveTab).toBeDisabled()
    expect(liveTab).toHaveTextContent('0')
    expect(shortsTab).toBeDisabled()
    expect(shortsTab).toHaveTextContent('0')
    expect(
      screen.getByRole('button', { name: '新着動画（3件）' }),
    ).toBeEnabled()
  })

  test('should update the counts after refetching', async () => {
    const { queryClient } = renderWithClient(
      <LiveAndRecent
        prefetchedData={{
          live: [],
          recent: createVideos('recent', 3),
          shorts: createVideos('shorts', 1),
        }}
      />,
    )

    fetchDashboardVideos.mockResolvedValue({
      live: createVideos('live', 1),
      recent: createVideos('recent', 4),
      shorts: [],
    })

    await act(() =>
      queryClient.refetchQueries({ queryKey: ['dashboard-videos'] }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '配信中（1件）' }),
      ).toBeEnabled()
    })
    expect(
      screen.getByRole('button', { name: '新着動画（4件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ショート（0件）' }),
    ).toBeDisabled()
  })
})
