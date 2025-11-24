import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VideoActionConfirmDialog } from './video-action-confirm-dialog'

describe('VideoActionConfirmDialog', () => {
  const mockVideos = [
    { id: '1', title: 'Test Video 1' },
    { id: '2', title: 'Test Video 2' },
  ]

  it('renders delete dialog with warning for single video', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(screen.getByText('動画を削除')).toBeInTheDocument()
    expect(
      screen.getByText('以下の動画を削除します。この操作は取り消せません。'),
    ).toBeInTheDocument()
    expect(screen.getByText('Test Video 1')).toBeInTheDocument()
  })

  it('shows keyword confirmation for bulk delete (3+ videos)', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    const onOpenChange = vi.fn()

    const bulkVideos = [
      { id: '1', title: 'Video 1' },
      { id: '2', title: 'Video 2' },
      { id: '3', title: 'Video 3' },
    ]

    render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={bulkVideos}
      />,
    )

    expect(
      screen.getByText('続行するには「削除」と入力してください:'),
    ).toBeInTheDocument()

    // Button should be disabled initially
    const confirmButton = screen.getByRole('button', { name: /削除する/i })
    expect(confirmButton).toBeDisabled()
  })

  it('does not require keyword confirmation for single or double delete', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    const { rerender } = render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    // Should not show keyword input for single video
    expect(
      screen.queryByText('続行するには「削除」と入力してください:'),
    ).not.toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={mockVideos}
      />,
    )

    // Should not show keyword input for 2 videos
    expect(
      screen.queryByText('続行するには「削除」と入力してください:'),
    ).not.toBeInTheDocument()
  })

  it('renders restore dialog with green theme', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <VideoActionConfirmDialog
        action="restore"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={mockVideos}
      />,
    )

    expect(screen.getByText('動画を復元')).toBeInTheDocument()
    expect(screen.getByText(/2件の動画を復元します/)).toBeInTheDocument()
  })

  it('renders toggle visibility dialog', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <VideoActionConfirmDialog
        action="toggle"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={mockVideos}
      />,
    )

    expect(screen.getByText('表示状態を切り替え')).toBeInTheDocument()
    expect(
      screen.getByText(/2件の動画の表示状態を切り替えます/),
    ).toBeInTheDocument()
  })

  it('displays all videos in the list', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={mockVideos}
      />,
    )

    expect(screen.getByText('対象動画 (2件):')).toBeInTheDocument()
    expect(screen.getByText('Test Video 1')).toBeInTheDocument()
    expect(screen.getByText('Test Video 2')).toBeInTheDocument()
  })

  it('renders different button text based on action', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    const { rerender } = render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(
      screen.getByRole('button', { name: /削除する/i }),
    ).toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="restore"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(
      screen.getByRole('button', { name: /復元する/i }),
    ).toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="toggle"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(
      screen.getByRole('button', { name: /切り替える/i }),
    ).toBeInTheDocument()
  })

  it('displays icons for different actions', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    const { rerender } = render(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(screen.getByText('⚠️')).toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="restore"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(screen.getByText('🔄')).toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="toggle"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={[mockVideos[0]]}
      />,
    )

    expect(screen.getByText('👁️')).toBeInTheDocument()
  })
})
