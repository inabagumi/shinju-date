import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import type {
  VideoBackfillRun,
  VideoBackfillRunAccount,
  VideoBackfillRunState,
} from '../_lib/get-video-backfill-run'

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

function renderPanel(run: VideoBackfillRun | null) {
  const initialData: VideoBackfillRunState = { run, success: true, targets }

  return render(<VideoBackfillRunPanel initialData={initialData} />, {
    wrapper: ActionToastProvider,
  })
}

describe('VideoBackfillRunPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the progress it was given without fetching it', () => {
    renderPanel(createRun())

    expect(screen.getByText('Alice')).toBeTruthy()
    expect(screen.getByText('終了')).toBeTruthy()
    expect(mocks.getVideoBackfillRunAction).not.toHaveBeenCalled()
  })

  it('confirms the number of accounts before requesting a check', async () => {
    mocks.requestVideoBackfillRunAction.mockResolvedValue({
      data: {
        message: '全タレントの取得漏れチェックを3件キューに追加しました。',
      },
      success: true,
    })
    mocks.getVideoBackfillRunAction.mockResolvedValue({
      data: {
        run: createRun({
          accounts: [createAccount({ active: true, status: 'pending' })],
          active: true,
          counts: {
            done: 0,
            failed: 0,
            interrupted: 0,
            pending: 1,
            running: 0,
          },
        }),
        success: true,
        targets,
      },
      success: true,
    })

    renderPanel(null)

    expect(
      screen.getByText('最近の取得漏れチェックはありません。'),
    ).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: '取得漏れをチェックする' }),
    )

    const dialog = screen.getByRole('dialog')

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

    // The check that was just queued shows up without reloading the page.
    expect(await screen.findByRole('button', { name: '実行中' })).toBeTruthy()
    expect(screen.getByText('待機中', { selector: 'span' })).toBeTruthy()
  })

  it('cannot be requested while the latest check is in progress', () => {
    renderPanel(
      createRun({
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
    )

    expect(screen.getByRole('button', { name: '実行中' })).toHaveProperty(
      'disabled',
      true,
    )
    expect(screen.getByText('quota exceeded')).toBeTruthy()
    expect(screen.getByText(/実行中のため除外: 1件/)).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '1',
    )
  })

  it('can be requested again once the latest check has ended', () => {
    renderPanel(createRun())

    expect(
      screen.getByRole('button', { name: '取得漏れをチェックする' }),
    ).toHaveProperty('disabled', false)
  })

  it('cannot be requested when no active talent has an account', () => {
    render(
      <VideoBackfillRunPanel
        initialData={{
          run: null,
          success: true,
          targets: { twitch: 0, youtube: 0 },
        }}
      />,
      { wrapper: ActionToastProvider },
    )

    expect(
      screen.getByRole('button', { name: '取得漏れをチェックする' }),
    ).toHaveProperty('disabled', true)
  })

  it('lists the accounts that need attention first', () => {
    renderPanel(
      createRun({
        accounts: [
          createAccount({ name: 'Done' }),
          createAccount({
            accountId: 'channel-row-2',
            name: 'Interrupted',
            status: 'interrupted',
          }),
          createAccount({
            accountId: 'channel-row-3',
            active: true,
            name: 'Running',
            status: 'running',
          }),
        ],
        active: true,
        counts: { done: 1, failed: 0, interrupted: 1, pending: 0, running: 1 },
      }),
    )

    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual([
      expect.stringContaining('Running'),
      expect.stringContaining('Interrupted'),
      expect.stringContaining('Done'),
    ])
  })
})
