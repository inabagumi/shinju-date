import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  VideoBackfillFailure,
  VideoBackfillHistoryEntry,
} from '../_actions/video-backfill-history'

const mocks = vi.hoisted(() => ({
  getVideoBackfillHistoryAction: vi.fn(),
  retryFailedVideoBackfillJobsAction: vi.fn(),
}))

vi.mock('../_actions/video-backfill-history', () => ({
  getVideoBackfillHistoryAction: mocks.getVideoBackfillHistoryAction,
  retryFailedVideoBackfillJobsAction: mocks.retryFailedVideoBackfillJobsAction,
}))

const { VideoBackfillHistoryPanel } = await import(
  './video-backfill-history-panel'
)

function createEntry(
  overrides: Partial<VideoBackfillHistoryEntry> = {},
): VideoBackfillHistoryEntry {
  return {
    accountId: 'channel-row-1',
    added: 12,
    error: null,
    finishedAt: '2026-11-14T02:00:00Z',
    id: 'history-1',
    name: 'Main',
    pages: 3,
    provider: 'youtube',
    requestedAt: '2026-11-14T01:00:00Z',
    requester: 'admin@example.com',
    scope: 'all',
    status: 'done',
    talentId: 'talent-1',
    talentName: 'Alice',
    ...overrides,
  }
}

function createFailure(
  overrides: Partial<VideoBackfillFailure> = {},
): VideoBackfillFailure {
  return {
    accountId: 'twitch-row-1',
    active: false,
    error: 'quota exceeded',
    finishedAt: '2026-11-14T03:00:00Z',
    name: 'alice',
    provider: 'twitch',
    talentId: 'talent-1',
    talentName: 'Alice',
    ...overrides,
  }
}

describe('VideoBackfillHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows what past backfills did and who requested them', async () => {
    mocks.getVideoBackfillHistoryAction.mockResolvedValue({
      entries: [
        createEntry(),
        createEntry({
          added: 0,
          error: 'Account not found: channel-row-gone',
          id: 'history-2',
          name: null,
          pages: 0,
          requester: null,
          scope: 'talent',
          status: 'failed',
        }),
      ],
      failures: [],
      success: true,
    })

    render(<VideoBackfillHistoryPanel />)

    expect(
      await screen.findByText(
        '12件追加 · 3ページ · admin@example.comが全タレントのチェックから依頼',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText(
        '0件追加 · 0ページ · 不明なユーザーがタレント詳細から依頼',
      ),
    ).toBeTruthy()
    expect(screen.getByText('削除されたアカウント')).toBeTruthy()
    expect(screen.getByText('Account not found: channel-row-gone')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '失敗したジョブを再試行' }),
    ).toHaveProperty('disabled', true)
  })

  it('confirms before retrying the failed jobs at once', async () => {
    mocks.getVideoBackfillHistoryAction
      .mockResolvedValueOnce({
        entries: [],
        failures: [
          createFailure(),
          createFailure({
            accountId: 'channel-row-2',
            active: true,
            name: 'Main',
            provider: 'youtube',
          }),
        ],
        success: true,
      })
      .mockResolvedValue({ entries: [], failures: [], success: true })
    mocks.retryFailedVideoBackfillJobsAction.mockResolvedValue({
      message: '失敗した過去動画の取り込みを1件キューに追加しました。',
      success: true,
    })

    render(<VideoBackfillHistoryPanel />)

    expect(
      await screen.findByText(/最後の取り込みが失敗したアカウント: 2件/),
    ).toBeTruthy()
    expect(screen.getByText(/再試行中: 1件/)).toBeTruthy()

    const button = screen.getByRole('button', {
      name: '失敗したジョブを再試行',
    })

    await waitFor(() => expect(button).toHaveProperty('disabled', false))
    fireEvent.click(button)

    const dialog = await screen.findByRole('dialog')

    expect(dialog.textContent).toContain('1件のアカウント')
    expect(mocks.retryFailedVideoBackfillJobsAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '再試行する' }))

    expect(
      await screen.findByText(
        '失敗した過去動画の取り込みを1件キューに追加しました。',
      ),
    ).toBeTruthy()
    expect(mocks.retryFailedVideoBackfillJobsAction).toHaveBeenCalledOnce()
    expect(mocks.getVideoBackfillHistoryAction).toHaveBeenCalledTimes(2)
  })

  it('offers a reload when the history cannot be loaded', async () => {
    mocks.getVideoBackfillHistoryAction
      .mockResolvedValueOnce({ error: 'permission denied', success: false })
      .mockResolvedValueOnce({
        entries: [createEntry()],
        failures: [],
        success: true,
      })

    render(<VideoBackfillHistoryPanel />)

    fireEvent.click(await screen.findByRole('button', { name: '再試行' }))

    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(screen.queryByText('permission denied')).toBeNull()
  })
})
