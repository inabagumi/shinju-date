import { ToastProvider, ToastViewport } from '@shinju-date/ui'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toggleVisibilityAction } from '../_actions'
import type { Video } from '../_lib/get-videos'
import VideoList from './video-list'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('../_actions', () => ({
  restoreAction: vi.fn(),
  softDeleteAction: vi.fn(),
  toggleVisibilityAction: vi.fn(),
}))

function createVideo(overrides: Partial<Video> = {}): Video {
  return {
    clicks: 0,
    deleted_at: null,
    duration: 'PT1H2M3S',
    id: '00000000-0000-4000-8000-000000000001',
    platform: 'youtube',
    published_at: '2025-01-01T00:00:00Z',
    status: 'ENDED',
    talent: { id: '00000000-0000-4000-8000-000000000002', name: 'Talent A' },
    thumbnail: null,
    title: 'Test Video',
    twitch_video: null,
    updated_at: '2025-01-02T00:00:00Z',
    video_kind: 'standard',
    visible: true,
    youtube_video: { youtube_video_id: 'abcdefghijk' },
    ...overrides,
  }
}

describe('VideoList', () => {
  it('renders the talent name', () => {
    render(<VideoList videos={[createVideo()]} />)

    const row = screen.getByText('Test Video').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('Talent A')).toBeInTheDocument()
  })

  it('renders a fallback instead of crashing when the talent is missing', () => {
    render(<VideoList videos={[createVideo({ talent: null })]} />)

    const row = screen.getByText('Test Video').closest('tr')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement).getByText('タレント不明'),
    ).toBeInTheDocument()
  })

  it('shows the published and updated dates in one column', () => {
    render(<VideoList videos={[createVideo()]} />)

    const row = screen.getByText('Test Video').closest('tr') as HTMLElement
    const published = within(row).getByText('公開')
    const updated = within(row).getByText('更新')

    expect(published.closest('td')).toBe(updated.closest('td'))
    expect(
      published.closest('td')?.querySelectorAll('time[datetime]'),
    ).toHaveLength(2)
  })

  it('shows the platform and video kind badges in one column', () => {
    render(<VideoList videos={[createVideo({ video_kind: 'short' })]} />)

    const row = screen.getByText('Test Video').closest('tr') as HTMLElement
    const platform = within(row).getByText('YouTube')
    const kind = within(row).getByText('ショート')

    expect(platform.closest('td')).toBe(kind.closest('td'))
  })

  describe('bulk actions', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    function renderWithToast() {
      render(
        <ToastProvider>
          <VideoList videos={[createVideo()]} />
          <ToastViewport />
        </ToastProvider>,
      )
    }

    function toggleSelectedVideos() {
      fireEvent.click(screen.getByLabelText('「Test Video」を選択'))
      fireEvent.click(
        screen.getByRole('button', { name: '表示/非表示を切り替え' }),
      )
      fireEvent.click(screen.getByRole('button', { name: '切り替える' }))
    }

    it('shows a success toast and clears the selection', async () => {
      vi.mocked(toggleVisibilityAction).mockResolvedValue({
        success: true,
        updatedCount: 1,
      })

      renderWithToast()
      toggleSelectedVideos()

      expect(
        await screen.findByText('1 件の動画の表示状態を更新しました。'),
      ).toBeInTheDocument()
      expect(toggleVisibilityAction).toHaveBeenCalledWith([
        '00000000-0000-4000-8000-000000000001',
      ])
      await waitFor(() =>
        expect(screen.queryByText('1 件選択中')).not.toBeInTheDocument(),
      )
    })

    it('shows an error toast and keeps the selection', async () => {
      vi.mocked(toggleVisibilityAction).mockResolvedValue({
        error: '更新できませんでした。',
        success: false,
      })

      renderWithToast()
      toggleSelectedVideos()

      expect(
        await screen.findByText('更新できませんでした。'),
      ).toBeInTheDocument()
      expect(screen.getByText('1 件選択中')).toBeInTheDocument()
    })
  })
})
