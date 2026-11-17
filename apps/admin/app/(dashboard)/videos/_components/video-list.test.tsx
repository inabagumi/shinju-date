import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../_actions'
import type { Video } from '../_lib/get-videos'
import VideoList from './video-list'

vi.mock('next/navigation', () => ({
  usePathname: () => '/videos',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('../_actions', () => ({
  restoreAction: vi.fn(),
  softDeleteAction: vi.fn(),
  toggleVisibilityAction: vi.fn(),
}))

interface WrapperProps {
  children: ReactNode
}

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
    render(<VideoList videos={[createVideo()]} />, {
      wrapper: ActionToastProvider,
    })

    const row = screen.getByText('Test Video').closest('tr')
    expect(row).not.toBeNull()
    expect(within(row as HTMLElement).getByText('Talent A')).toBeInTheDocument()
  })

  it('renders a fallback instead of crashing when the talent is missing', () => {
    render(<VideoList videos={[createVideo({ talent: null })]} />, {
      wrapper: ActionToastProvider,
    })

    const row = screen.getByText('Test Video').closest('tr')
    expect(row).not.toBeNull()
    expect(
      within(row as HTMLElement).getByText('タレント不明'),
    ).toBeInTheDocument()
  })

  it('shows the published and updated dates in one column', () => {
    render(<VideoList videos={[createVideo()]} />, {
      wrapper: ActionToastProvider,
    })

    const row = screen.getByText('Test Video').closest('tr') as HTMLElement
    const published = within(row).getByText('公開')
    const updated = within(row).getByText('更新')

    expect(published.closest('td')).toBe(updated.closest('td'))
    expect(
      published.closest('td')?.querySelectorAll('time[datetime]'),
    ).toHaveLength(2)
  })

  it('shows the platform and video kind badges in one column', () => {
    render(<VideoList videos={[createVideo({ video_kind: 'short' })]} />, {
      wrapper: ActionToastProvider,
    })

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
        <ActionToastProvider>
          <VideoList videos={[createVideo()]} />
        </ActionToastProvider>,
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

  describe('selection across lists', () => {
    const videoA = createVideo({
      id: '00000000-0000-4000-8000-00000000000a',
      title: 'Video A',
    })
    const videoB = createVideo({
      id: '00000000-0000-4000-8000-00000000000b',
      title: 'Video B',
    })
    const videoC = createVideo({
      id: '00000000-0000-4000-8000-00000000000c',
      title: 'Video C',
    })
    const videoD = createVideo({
      id: '00000000-0000-4000-8000-00000000000d',
      title: 'Video D',
    })
    const deletedVideo = createVideo({
      deleted_at: '2025-01-03T00:00:00Z',
      id: '00000000-0000-4000-8000-00000000000e',
      title: 'Deleted Video',
    })

    function Wrapper({ children }: WrapperProps) {
      return <ActionToastProvider>{children}</ActionToastProvider>
    }

    function select(title: string) {
      fireEvent.click(screen.getByLabelText(`「${title}」を選択`))
    }

    function confirmDelete() {
      fireEvent.change(screen.getByLabelText(/「DELETE」と入力してください/), {
        target: { value: 'DELETE' },
      })
      fireEvent.click(screen.getByRole('button', { name: '削除する' }))
    }

    beforeEach(() => {
      vi.clearAllMocks()
      vi.mocked(softDeleteAction).mockResolvedValue({ success: true })
      vi.mocked(restoreAction).mockResolvedValue({ success: true })
    })

    it('drops the selection that is no longer in the list', async () => {
      const { rerender } = render(<VideoList videos={[videoA, videoB]} />, {
        wrapper: Wrapper,
      })
      select('Video A')
      select('Video B')
      expect(screen.getByText('2 件選択中')).toBeInTheDocument()

      rerender(<VideoList videos={[videoC]} />)
      expect(
        screen.getByText('動画を選択すると、まとめて操作できます。'),
      ).toBeInTheDocument()

      select('Video C')
      expect(screen.getByText('1 件選択中')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '削除' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Video C')).toBeInTheDocument()
      expect(within(dialog).queryByText('Video A')).not.toBeInTheDocument()
      expect(within(dialog).queryByText('Video B')).not.toBeInTheDocument()

      confirmDelete()

      await waitFor(() =>
        expect(softDeleteAction).toHaveBeenCalledWith([videoC.id]),
      )
    })

    it('does not restore the selection when returning to the previous list', () => {
      const { rerender } = render(<VideoList videos={[videoA, videoB]} />, {
        wrapper: Wrapper,
      })
      select('Video A')

      rerender(<VideoList videos={[videoC]} />)
      rerender(<VideoList videos={[videoA, videoB]} />)

      expect(screen.getByLabelText('「Video A」を選択')).not.toBeChecked()
      expect(
        screen.getByText('動画を選択すると、まとめて操作できます。'),
      ).toBeInTheDocument()
    })

    it('checks "select all" only when every video in the list is selected', () => {
      const { rerender } = render(<VideoList videos={[videoA, videoB]} />, {
        wrapper: Wrapper,
      })
      select('Video A')

      rerender(<VideoList videos={[videoC, videoD]} />)
      select('Video C')

      expect(screen.getByLabelText('すべて選択')).not.toBeChecked()

      select('Video D')

      expect(screen.getByLabelText('すべて選択')).toBeChecked()
    })

    it('deletes only the non-deleted videos shown in the dialog', async () => {
      render(<VideoList videos={[videoA, deletedVideo]} />, {
        wrapper: Wrapper,
      })
      fireEvent.click(screen.getByLabelText('すべて選択'))
      expect(screen.getByText('2 件選択中')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '削除' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Video A')).toBeInTheDocument()
      expect(
        within(dialog).queryByText('Deleted Video'),
      ).not.toBeInTheDocument()

      confirmDelete()

      await waitFor(() =>
        expect(softDeleteAction).toHaveBeenCalledWith([videoA.id]),
      )
    })

    it('restores only the deleted videos shown in the dialog', async () => {
      render(<VideoList videos={[videoA, deletedVideo]} />, {
        wrapper: Wrapper,
      })
      fireEvent.click(screen.getByLabelText('すべて選択'))

      fireEvent.click(screen.getByRole('button', { name: '復元' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByText('Deleted Video')).toBeInTheDocument()
      expect(within(dialog).queryByText('Video A')).not.toBeInTheDocument()

      fireEvent.click(within(dialog).getByRole('button', { name: '復元する' }))

      await waitFor(() =>
        expect(restoreAction).toHaveBeenCalledWith([deletedVideo.id]),
      )
    })
  })
})
