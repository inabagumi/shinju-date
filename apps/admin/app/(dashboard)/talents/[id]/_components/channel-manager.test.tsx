import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'

const mocks = vi.hoisted(() => ({
  addYouTubeChannelAction: vi.fn(),
  removeYouTubeChannelAction: vi.fn(),
}))

vi.mock('../../_actions/channels', () => ({
  addYouTubeChannelAction: mocks.addYouTubeChannelAction,
  removeYouTubeChannelAction: mocks.removeYouTubeChannelAction,
}))

const { ChannelManager } = await import('./channel-manager')

function renderManager() {
  return render(
    <ActionToastProvider>
      <ChannelManager
        channels={[
          {
            id: 'channel-row-1',
            name: 'Main Channel',
            youtube_channel_id: 'UC0000000000000000000001',
            youtube_handle: '@main',
          },
        ]}
        isDeleted={false}
        talentId="talent-1"
      />
    </ActionToastProvider>,
  )
}

describe('ChannelManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for confirmation with the channel to remove', () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent(
      'このチャンネルを削除してもよろしいですか？',
    )
    expect(dialog).toHaveTextContent('関連する動画データは削除されません。')
    expect(dialog).toHaveTextContent('Main Channel')
    expect(dialog).toHaveTextContent('UC0000000000000000000001')
  })

  it('does not remove the channel when cancelled', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.removeYouTubeChannelAction).not.toHaveBeenCalled()
  })

  it('removes the channel when confirmed', async () => {
    mocks.removeYouTubeChannelAction.mockResolvedValue({ success: true })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() =>
      expect(mocks.removeYouTubeChannelAction).toHaveBeenCalledWith(
        'channel-row-1',
        'talent-1',
      ),
    )
  })

  it('shows the error in a toast when the removal fails', async () => {
    mocks.removeYouTubeChannelAction.mockResolvedValue({
      error: '削除できませんでした。',
      success: false,
    })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('削除できませんでした。'),
    ).toBeInTheDocument()
  })

  it('shows a fallback error in a toast when the removal throws', async () => {
    mocks.removeYouTubeChannelAction.mockRejectedValue(new Error('network'))

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('チャンネルの削除に失敗しました。'),
    ).toBeInTheDocument()
  })

  it('adds with the dialog and closes it on success', async () => {
    mocks.addYouTubeChannelAction.mockResolvedValue({ success: true })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを追加' }))

    const dialog = screen.getByRole('dialog', {
      name: 'YouTubeチャンネルを追加',
    })

    fireEvent.change(
      within(dialog).getByRole('textbox', {
        name: 'ハンドル / チャンネルID / URL',
      }),
      { target: { value: '@example' } },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: '追加' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const formData = mocks.addYouTubeChannelAction.mock
      .calls[0]?.[1] as FormData

    expect(formData.get('talent_id')).toBe('talent-1')
    expect(formData.get('youtube_channel_id')).toBe('@example')
  })

  it('keeps the dialog open when adding fails', async () => {
    mocks.addYouTubeChannelAction.mockResolvedValue({
      errors: { generic: ['チャンネルの追加に失敗しました。'] },
    })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'チャンネルを追加' }))

    const dialog = screen.getByRole('dialog', {
      name: 'YouTubeチャンネルを追加',
    })

    fireEvent.click(within(dialog).getByRole('button', { name: '追加' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'チャンネルの追加に失敗しました。',
    )
    expect(screen.getByRole('dialog')).toBe(dialog)
  })
})
