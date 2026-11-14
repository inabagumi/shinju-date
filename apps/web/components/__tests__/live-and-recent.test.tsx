import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { Video } from '@/lib/fetchers'
import LiveAndRecent from '../live-and-recent'

vi.mock('@/lib/fetchers', () => ({
  fetchDashboardVideos: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../shorts-carousel', () => ({
  default: () => null,
}))

vi.mock('../video-card', () => ({
  default: () => null,
  VideoCardSkeleton: () => null,
}))

function createVideos(count: number, prefix: string): Video[] {
  return Array.from(
    { length: count },
    (_, index) => ({ id: `${prefix}-${index}` }) as Video,
  )
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)

  return queryClient
}

describe('LiveAndRecent', () => {
  test('should show the number of videos next to each tab label', () => {
    renderWithQueryClient(
      <LiveAndRecent
        prefetchedData={{
          live: createVideos(3, 'live'),
          recent: createVideos(10, 'recent'),
          shorts: createVideos(20, 'shorts'),
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: '配信中（3件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '新着動画（10件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ショート（20件）' }),
    ).toBeInTheDocument()
  })

  test('should show 0 and keep the tab disabled when it has no videos', () => {
    renderWithQueryClient(
      <LiveAndRecent
        prefetchedData={{
          live: [],
          recent: createVideos(2, 'recent'),
          shorts: createVideos(1, 'shorts'),
        }}
      />,
    )

    const liveTab = screen.getByRole('button', { name: '配信中（0件）' })

    expect(liveTab).toBeDisabled()
    expect(liveTab).toHaveTextContent('0')
    expect(
      screen.getByRole('button', { name: '新着動画（2件）' }),
    ).toBeEnabled()
  })

  test('should update the counts when the query data is refreshed', async () => {
    const queryClient = renderWithQueryClient(
      <LiveAndRecent
        prefetchedData={{
          live: createVideos(1, 'live'),
          recent: createVideos(2, 'recent'),
          shorts: createVideos(3, 'shorts'),
        }}
      />,
    )

    act(() => {
      queryClient.setQueryData(['dashboard-videos'], {
        live: [],
        recent: createVideos(5, 'recent'),
        shorts: createVideos(4, 'shorts'),
      })
    })

    expect(
      await screen.findByRole('button', { name: '配信中（0件）' }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: '新着動画（5件）' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'ショート（4件）' }),
    ).toBeInTheDocument()
  })
})
