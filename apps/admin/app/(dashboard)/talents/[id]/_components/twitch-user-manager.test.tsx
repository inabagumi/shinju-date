import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'

const mocks = vi.hoisted(() => ({
  addTwitchUserAction: vi.fn(),
  removeTwitchUserAction: vi.fn(),
}))

vi.mock('../../_actions/twitch-users', () => ({
  addTwitchUserAction: mocks.addTwitchUserAction,
  removeTwitchUserAction: mocks.removeTwitchUserAction,
}))

const { TwitchUserManager } = await import('./twitch-user-manager')

function renderManager() {
  return render(
    <ActionToastProvider>
      <TwitchUserManager
        isDeleted={false}
        talentId="talent-1"
        users={[
          {
            id: 'twitch-row-1',
            name: 'Example User',
            twitch_login_name: 'example',
            twitch_user_id: '123456789',
          },
        ]}
      />
    </ActionToastProvider>,
  )
}

describe('TwitchUserManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for confirmation with the user to remove', () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'ユーザーを削除' }))

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent(
      'このTwitchユーザーを削除してもよろしいですか？',
    )
    expect(dialog).toHaveTextContent('関連する動画データは削除されません。')
    expect(dialog).toHaveTextContent('Example User')
    expect(dialog).toHaveTextContent('123456789')
  })

  it('does not remove the user when cancelled', async () => {
    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'ユーザーを削除' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.removeTwitchUserAction).not.toHaveBeenCalled()
  })

  it('removes the user when confirmed', async () => {
    mocks.removeTwitchUserAction.mockResolvedValue({ success: true })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'ユーザーを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() =>
      expect(mocks.removeTwitchUserAction).toHaveBeenCalledWith(
        'twitch-row-1',
        'talent-1',
      ),
    )
  })

  it('shows the error in a toast when the removal fails', async () => {
    mocks.removeTwitchUserAction.mockResolvedValue({
      error: '削除できませんでした。',
      success: false,
    })

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'ユーザーを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('削除できませんでした。'),
    ).toBeInTheDocument()
  })

  it('shows a fallback error in a toast when the removal throws', async () => {
    mocks.removeTwitchUserAction.mockRejectedValue(new Error('network'))

    renderManager()

    fireEvent.click(screen.getByRole('button', { name: 'ユーザーを削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('Twitchユーザーの削除に失敗しました。'),
    ).toBeInTheDocument()
  })
})
