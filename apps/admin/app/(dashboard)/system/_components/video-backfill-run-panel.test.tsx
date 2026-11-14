import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  VideoBackfillRun,
  VideoBackfillRunAccount,
} from '../_actions/video-backfill-run'

const mocks = vi.hoisted(() => ({
  getVideoBackfillRunAction: vi.fn(),
  requestVideoBackfillRunAction: vi.fn(),
}))

vi.mock('../_actions/video-backfill-run', () => ({
  getVideoBackfillRunAction: mocks.getVideoBackfillRunAction,
  requestVideoBackfillRunAction: mocks.requestVideoBackfillRunAction,
}))

const { VideoBackfillRunPanel } = await import('./video-backfill-run-panel')

const targets = { twitch: 1, youtube: 2 }

function createAccount(
  overrides: Partial<VideoBackfillRunAccount> = {},
): VideoBackfillRunAccount {
  return {
    accountId: 'channel-row-1',
    active: false,
    added: 0,
    error: null,
    name: 'Main',
    provider: 'youtube',
    status: 'done',
    talentId: 'talent-1',
    talentName: 'Alice',
    updatedAt: null,
    ...overrides,
  }
}

function createRun(
  overrides: Partial<VideoBackfillRun> = {},
): VideoBackfillRun {
  return {
    accounts: [createAccount()],
    active: false,
    added: 0,
    counts: { done: 1, failed: 0, interrupted: 0, pending: 0, running: 0 },
    failed: 0,
    id: 'run-1',
    requestedAt: '2026-11-14T00:00:00Z',
    skipped: 0,
    ...overrides,
  }
}

describe('VideoBackfillRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('confirms the number of accounts before requesting a check', async () => {
    mocks.getVideoBackfillRunAction.mockResolvedValue({
      run: null,
      success: true,
      targets,
    })
    mocks.requestVideoBackfillRunAction.mockResolvedValue({
      message: '全タレントの取得漏れチェックを3件キューに追加しました。',
      success: true,
    })

    render(<VideoBackfillRunPanel />)

    expect(
      await screen.findByText('最近の取得漏れチェックはありません。'),
    ).toBeTruthy()

    fireEvent.click(
      await screen.findByRole('button', { name: '取得漏れをチェックする' }),
    )

    const dialog = await screen.findByRole('dialog')

    expect(dialog.textContent).toContain('YouTube チャンネル 2件')
    expect(dialog.textContent).toContain('Twitch アカウント 1件')
    expect(dialog.textContent).toContain('合計 3件')
    expect(mocks.requestVideoBackfillRunAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'チェックする' }))

    expect(
      await screen.findByText(
        '全タレントの取得漏れチェックを3件キューに追加しました。',
      ),
    ).toBeTruthy()
    expect(mocks.requestVideoBackfillRunAction).toHaveBeenCalledOnce()
  })

  it('cannot be requested while the latest check is in progress', async () => {
    mocks.getVideoBackfillRunAction.mockResolvedValue({
      run: createRun({
        accounts: [
          createAccount({ active: true, added: 3, status: 'running' }),
          createAccount({
            accountId: 'twitch-row-1',
            error: 'quota exceeded',
            name: 'alice',
            provider: 'twitch',
            status: 'failed',
          }),
        ],
        active: true,
        added: 3,
        counts: { done: 0, failed: 1, interrupted: 0, pending: 0, running: 1 },
        skipped: 1,
      }),
      success: true,
      targets,
    })

    render(<VideoBackfillRunPanel />)

    const button = await screen.findByRole('button', { name: '実行中' })

    expect(button).toHaveProperty('disabled', true)
    expect(screen.getByText('quota exceeded')).toBeTruthy()
    expect(screen.getByText(/実行中のため除外: 1件/)).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '1',
    )
  })

  it('can be requested again once the latest check has ended', async () => {
    mocks.getVideoBackfillRunAction.mockResolvedValue({
      run: createRun(),
      success: true,
      targets,
    })

    render(<VideoBackfillRunPanel />)

    const button = await screen.findByRole('button', {
      name: '取得漏れをチェックする',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    expect(screen.getByText('終了')).toBeTruthy()
  })

  it('offers a retry when the progress cannot be loaded', async () => {
    mocks.getVideoBackfillRunAction
      .mockResolvedValueOnce({
        error: 'Redis に接続できません',
        success: false,
      })
      .mockResolvedValueOnce({ run: createRun(), success: true, targets })

    render(<VideoBackfillRunPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '再試行' }))

    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(screen.queryByText('Redis に接続できません')).toBeNull()
  })
})
