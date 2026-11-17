import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import type {
  VideoBackfillFailure,
  VideoBackfillHistory,
  VideoBackfillHistoryEntry,
} from '../_lib/get-video-backfill-history'

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

function renderPanel(
  history: Partial<Omit<VideoBackfillHistory, 'success'>> = {},
) {
  return render(
    <VideoBackfillHistoryPanel
      initialData={{ entries: [], failures: [], success: true, ...history }}
    />,
    { wrapper: ActionToastProvider },
  )
}

describe('VideoBackfillHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows what past backfills did and who requested them', () => {
    renderPanel({
      entries: [
        createEntry(),
        createEntry({
          added: 0,
          error: 'Account not found: channel-row-gone',
          id: 'history-2',
          name: null,
          pages: 0,
          requester: null,
          scope: 'single',
          status: 'failed',
        }),
      ],
    })

    expect(
      screen.getByText(
        '12件追加 · 3ページ · admin@example.comが全タレントのチェックで依頼',
      ),
    ).toBeTruthy()
    expect(
      screen.getByText('0件追加 · 0ページ · 不明なユーザーが個別に依頼'),
    ).toBeTruthy()
    expect(screen.getByText('削除されたアカウント')).toBeTruthy()
    expect(screen.getByText('Account not found: channel-row-gone')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: '失敗したジョブを再試行' }),
    ).toHaveProperty('disabled', true)
    expect(mocks.getVideoBackfillHistoryAction).not.toHaveBeenCalled()
  })

  it('tells that there is no history yet', () => {
    renderPanel()

    expect(
      screen.getByText('終了した過去動画の取り込みはまだありません。'),
    ).toBeTruthy()
  })

  it('lists the accounts whose latest backfill failed', () => {
    renderPanel({
      failures: [
        createFailure(),
        createFailure({
          accountId: 'channel-row-2',
          active: true,
          name: 'Main',
          provider: 'youtube',
        }),
      ],
    })

    const failures = screen.getByRole('region', {
      name: '最後の取り込みが失敗したアカウント',
    })

    expect(
      within(failures).getByText(/最後の取り込みが失敗したアカウント: 2件/),
    ).toBeTruthy()
    expect(within(failures).getByText(/再試行中: 1件/)).toBeTruthy()
    expect(within(failures).getAllByText('quota exceeded')).toHaveLength(2)
    // The account that is retried shows that instead of when it failed.
    expect(within(failures).getByText('再試行中')).toBeTruthy()
  })

  it('confirms before retrying the failed jobs at once', async () => {
    mocks.getVideoBackfillHistoryAction.mockResolvedValue({
      entries: [],
      failures: [createFailure({ active: true })],
      success: true,
    })
    mocks.retryFailedVideoBackfillJobsAction.mockResolvedValue({
      message: '失敗した過去動画の取り込みを1件キューに追加しました。',
      success: true,
    })

    renderPanel({
      failures: [
        createFailure(),
        createFailure({
          accountId: 'channel-row-2',
          active: true,
          name: 'Main',
          provider: 'youtube',
        }),
      ],
    })

    const button = screen.getByRole('button', {
      name: '失敗したジョブを再試行',
    })

    fireEvent.click(button)

    const dialog = screen.getByRole('dialog')

    expect(dialog.textContent).toContain('1件のアカウント')
    expect(mocks.retryFailedVideoBackfillJobsAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '再試行する' }))

    expect(
      await screen.findByText(
        '失敗した過去動画の取り込みを1件キューに追加しました。',
      ),
    ).toBeTruthy()
    expect(mocks.retryFailedVideoBackfillJobsAction).toHaveBeenCalledOnce()

    // Every failed account is retried now, so nothing is left to request.
    expect(
      await screen.findByText(/最後の取り込みが失敗したアカウント: 1件/),
    ).toBeTruthy()
    expect(button).toHaveProperty('disabled', true)
  })
})
