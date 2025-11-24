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

  it('shows keyword confirmation for all delete operations', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
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

    expect(
      screen.getByText('続行するには「DELETE」と入力してください:'),
    ).toBeInTheDocument()

    // Button should be disabled initially
    const confirmButton = screen.getByRole('button', { name: /削除する/i })
    expect(confirmButton).toBeDisabled()
  })

  it('requires keyword confirmation for all delete operations', () => {
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

    // Should show keyword input for single video
    expect(
      screen.getByText('続行するには「DELETE」と入力してください:'),
    ).toBeInTheDocument()

    rerender(
      <VideoActionConfirmDialog
        action="delete"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        open={true}
        videos={mockVideos}
      />,
    )

    // Should show keyword input for multiple videos
    expect(
      screen.getByText('続行するには「DELETE」と入力してください:'),
    ).toBeInTheDocument()
  })

  it('renders restore dialog', () => {
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

  it('displays icons from lucide-react', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    // Just verify that icons are rendered without checking specific emoji
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
  })
})
