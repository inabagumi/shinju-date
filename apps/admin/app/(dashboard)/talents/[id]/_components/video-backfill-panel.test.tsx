import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import type { VideoBackfillAccount } from '../../_actions/backfill'

const mocks = vi.hoisted(() => ({
  getVideoBackfillStatusAction: vi.fn(),
  requestVideoBackfillAction: vi.fn(),
  // The same instance on every render, like the router of Next.js.
  router: { refresh: vi.fn() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks.router,
}))
vi.mock('../../_actions/backfill', () => ({
  getVideoBackfillStatusAction: mocks.getVideoBackfillStatusAction,
  requestVideoBackfillAction: mocks.requestVideoBackfillAction,
}))

const { VideoBackfillPanel } = await import('./video-backfill-panel')

function createAccount(
  overrides: Partial<VideoBackfillAccount> = {},
): VideoBackfillAccount {
  return {
    accountId: 'channel-row-1',
    active: false,
    added: 0,
    error: null,
    finishedAt: null,
    name: 'Main',
    pages: 0,
    provider: 'youtube',
    requestedAt: null,
    status: null,
    updatedAt: null,
    ...overrides,
  }
}

function renderPanel() {
  return render(
    <VideoBackfillPanel
      hasTwitchUsers={false}
      hasYouTubeChannels
      talentId="talent-1"
      talentName="Talent"
    />,
    { wrapper: ActionToastProvider },
  )
}

describe('VideoBackfillPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('offers a retry when the progress cannot be loaded', async () => {
    mocks.getVideoBackfillStatusAction
      .mockResolvedValueOnce({
        error: 'Redis に接続できません',
        success: false,
      })
      .mockResolvedValueOnce({ accounts: [createAccount()], success: true })

    renderPanel()

    fireEvent.click(await screen.findByRole('button', { name: '再試行' }))

    expect(await screen.findByText('Main')).toBeTruthy()
    expect(screen.queryByText('Redis に接続できません')).toBeNull()
    expect(mocks.getVideoBackfillStatusAction).toHaveBeenCalledTimes(2)
  })

  it('can still be requested while only some accounts are active', async () => {
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      accounts: [
        createAccount({ active: true, status: 'running' }),
        createAccount({ accountId: 'channel-row-2', name: 'Sub' }),
      ],
      success: true,
    })

    renderPanel()

    const button = await screen.findByRole('button', {
      name: 'YouTubeの過去動画を取り込む',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
  })

  it('cannot be requested while every account is active', async () => {
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      accounts: [createAccount({ active: true, status: 'pending' })],
      success: true,
    })

    renderPanel()

    const button = await screen.findByRole('button', {
      name: 'YouTube: 実行中',
    })

    expect(button).toHaveProperty('disabled', true)
  })

  it('asks for confirmation with the talent and the accounts', async () => {
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      accounts: [
        createAccount(),
        createAccount({ accountId: 'channel-row-2', name: 'Sub' }),
      ],
      success: true,
    })

    renderPanel()

    const button = await screen.findByRole('button', {
      name: 'YouTubeの過去動画を取り込む',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    fireEvent.click(button)

    const dialog = screen.getByRole('dialog')

    expect(dialog).toHaveTextContent(
      '「Talent」のYouTubeアカウント（2件）の過去動画をすべて確認し、未登録の動画を取り込みますか？',
    )
    expect(dialog).toHaveTextContent(
      '処理はバックグラウンドで順番に行われます。',
    )
    expect(within(dialog).getByText('Main')).toBeTruthy()
    expect(within(dialog).getByText('Sub')).toBeTruthy()
  })

  it('does not request the backfill when cancelled', async () => {
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      accounts: [createAccount()],
      success: true,
    })

    renderPanel()

    const button = await screen.findByRole('button', {
      name: 'YouTubeの過去動画を取り込む',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(mocks.requestVideoBackfillAction).not.toHaveBeenCalled()
  })

  it('requests the backfill when confirmed', async () => {
    mocks.getVideoBackfillStatusAction.mockResolvedValue({
      accounts: [createAccount()],
      success: true,
    })
    mocks.requestVideoBackfillAction.mockResolvedValue({
      message: 'キューに追加しました。',
      success: true,
    })

    renderPanel()

    const button = await screen.findByRole('button', {
      name: 'YouTubeの過去動画を取り込む',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: '取り込む' }))

    expect(await screen.findByText('キューに追加しました。')).toBeTruthy()
    expect(mocks.requestVideoBackfillAction).toHaveBeenCalledWith(
      'talent-1',
      'youtube',
    )
  })
})
