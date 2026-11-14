import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, test, vi } from 'vitest'
import type { Video } from '@/lib/fetchers'
import Timeline from '../timeline'

vi.mock('@/lib/fetchers', () => ({
  fetchUpcomingVideos: vi.fn(() => new Promise(() => {})),
}))

vi.mock('../video-card', () => ({
  default: ({ value }: { value: Video }) => <article>{value.title}</article>,
  VideoCardSkeleton: () => null,
}))

function createVideo(id: string, publishedAt: string): Video {
  return { id, published_at: publishedAt, title: id } as Video
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

function getGroup(name: RegExp) {
  return screen.getByRole('region', { name })
}

function getCardTitles(group: HTMLElement) {
  return within(group)
    .getAllByRole('article')
    .map((card) => card.textContent)
}

describe('Timeline', () => {
  test('should keep each single-video date next to its own card', () => {
    renderWithQueryClient(
      <Timeline
        prefetchedData={[
          // Asia/Tokyo: 2026-11-16 20:00
          createVideo('video-c', '2026-11-16T11:00:00Z'),
          // Asia/Tokyo: 2026-11-14 20:00
          createVideo('video-a', '2026-11-14T11:00:00Z'),
          // Asia/Tokyo: 2026-11-15 20:00
          createVideo('video-b', '2026-11-15T11:00:00Z'),
        ]}
      />,
    )

    const groups = screen.getAllByRole('region')

    expect(groups).toHaveLength(3)
    expect(
      groups.map((group) => within(group).getByRole('heading').textContent),
    ).toEqual([
      expect.stringMatching(/^2026\/11\/14/),
      expect.stringMatching(/^2026\/11\/15/),
      expect.stringMatching(/^2026\/11\/16/),
    ])

    for (const [index, title] of ['video-a', 'video-b', 'video-c'].entries()) {
      const group = groups[index] as HTMLElement

      expect(getCardTitles(group)).toEqual([title])
      expect(within(group).getByText('1件')).toBeInTheDocument()
    }
  })

  test('should group multiple videos on the same date under one heading', () => {
    renderWithQueryClient(
      <Timeline
        prefetchedData={[
          // Asia/Tokyo: 2026-11-15 00:30 (next day in JST)
          createVideo('video-d', '2026-11-14T15:30:00Z'),
          // Asia/Tokyo: 2026-11-14 21:00
          createVideo('video-c', '2026-11-14T12:00:00Z'),
          // Asia/Tokyo: 2026-11-14 18:00
          createVideo('video-a', '2026-11-14T09:00:00Z'),
          // Asia/Tokyo: 2026-11-14 19:00
          createVideo('video-b', '2026-11-14T10:00:00Z'),
        ]}
      />,
    )

    const firstGroup = getGroup(/^2026\/11\/14/)
    const secondGroup = getGroup(/^2026\/11\/15/)

    expect(getCardTitles(firstGroup)).toEqual(['video-a', 'video-b', 'video-c'])
    expect(within(firstGroup).getByText('3件')).toBeInTheDocument()
    expect(getCardTitles(secondGroup)).toEqual(['video-d'])
    expect(within(secondGroup).getByText('1件')).toBeInTheDocument()
  })

  test('should place the date heading before its cards and not on the opposite side', () => {
    renderWithQueryClient(
      <Timeline
        prefetchedData={[createVideo('video-a', '2026-11-14T11:00:00Z')]}
      />,
    )

    const group = getGroup(/^2026\/11\/14/)
    const heading = within(group).getByRole('heading', { level: 2 })
    const [card] = within(group).getAllByRole('article')

    expect(heading).not.toHaveClass('text-right')
    expect(
      heading.compareDocumentPosition(card as HTMLElement) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(within(heading).getByText(/2026\/11\/14/)).toHaveAttribute(
      'dateTime',
      '2026-11-14',
    )
  })
})
