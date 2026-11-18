import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../../_actions'
import {
  VideoActionsButtons,
  VideoActionsProvider,
  VideoDeleteButton,
} from './video-actions-buttons'

vi.mock('../../_actions', () => ({
  restoreAction: vi.fn(),
  softDeleteAction: vi.fn(),
  toggleVisibilityAction: vi.fn(),
}))

vi.mock('../../_actions/sync', () => ({
  syncVideoAction: vi.fn(),
}))

const VIDEO_ID = '00000000-0000-4000-8000-000000000001'

interface VideoOverrides {
  deleted_at?: string | null
  visible?: boolean
}

function renderActions({
  deleted_at = null,
  visible = true,
}: VideoOverrides = {}) {
  const video = {
    deleted_at,
    id: VIDEO_ID,
    platform: 'youtube' as const,
    title: 'Test Video',
    visible,
  }

  render(
    <ActionToastProvider>
      <VideoActionsProvider video={video}>
        <VideoActionsButtons video={video} />
        {deleted_at === null && <VideoDeleteButton />}
      </VideoActionsProvider>
    </ActionToastProvider>,
  )
}

describe('VideoActionsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens a single dialog shared by the header and the delete button', () => {
    renderActions()

    fireEvent.click(screen.getByRole('button', { name: '非表示にする' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByText('表示状態を切り替え')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    fireEvent.click(screen.getByRole('button', { name: '動画を削除' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(
      screen.getByText('以下の動画を削除します。この操作は取り消せません。'),
    ).toBeInTheDocument()
  })

  it('toggles the visibility and tells the new state', async () => {
    vi.mocked(toggleVisibilityAction).mockResolvedValue({
      data: { updatedCount: 1 },
      success: true,
    })
    renderActions({ visible: true })

    fireEvent.click(screen.getByRole('button', { name: '非表示にする' }))
    fireEvent.click(screen.getByRole('button', { name: '切り替える' }))

    expect(
      await screen.findByText('動画を非表示に変更しました。'),
    ).toBeInTheDocument()
    expect(toggleVisibilityAction).toHaveBeenCalledWith([VIDEO_ID])
  })

  it('deletes the video after the keyword is entered', async () => {
    vi.mocked(softDeleteAction).mockResolvedValue({ success: true })
    renderActions()

    fireEvent.click(screen.getByRole('button', { name: '動画を削除' }))
    fireEvent.change(screen.getByLabelText(/「DELETE」と入力してください/), {
      target: { value: 'DELETE' },
    })
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    expect(await screen.findByText('動画を削除しました。')).toBeInTheDocument()
    expect(softDeleteAction).toHaveBeenCalledWith([VIDEO_ID])
  })

  it('shows the error of a failed restore as a toast', async () => {
    vi.mocked(restoreAction).mockResolvedValue({
      error: '復元できませんでした。',
      success: false,
    })
    renderActions({ deleted_at: '2025-01-03T00:00:00Z' })

    fireEvent.click(screen.getByRole('button', { name: '復元' }))
    fireEvent.click(screen.getByRole('button', { name: '復元する' }))

    expect(
      await screen.findByText('復元できませんでした。'),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
