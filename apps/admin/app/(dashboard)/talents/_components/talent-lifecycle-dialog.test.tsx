import { Button } from '@shinju-date/ui'
import {
  fireEvent,
  getDefaultNormalizer,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  activateTalentAction: vi.fn(),
  deleteTalentAction: vi.fn(),
  restoreTalentAction: vi.fn(),
  retireTalentAction: vi.fn(),
}))

vi.mock('../_actions', () => mocks)

const { TalentLifecycleDialog } = await import('./talent-lifecycle-dialog')

const talent = { id: 'talent-1', name: 'テストタレント' }

const operations = [
  {
    action: mocks.restoreTalentAction,
    confirmLabel: '復活',
    description:
      'タレント「テストタレント」を復活しますか？\n動画の復旧も行われます。',
    operation: 'restore',
    successText: 'タレントを復活しました。',
    title: 'タレントを復活',
  },
  {
    action: mocks.retireTalentAction,
    confirmLabel: '引退にする',
    description: 'タレント「テストタレント」を引退にしますか？',
    operation: 'retire',
    successText: 'タレントを引退にしました。',
    title: 'タレントを引退にする',
  },
  {
    action: mocks.activateTalentAction,
    confirmLabel: 'アクティブに戻す',
    description: 'タレント「テストタレント」をアクティブに戻しますか？',
    operation: 'activate',
    successText: 'タレントをアクティブに戻しました。',
    title: 'タレントをアクティブに戻す',
  },
  {
    action: mocks.deleteTalentAction,
    confirmLabel: '削除',
    description:
      'タレント「テストタレント」を削除しますか？\n紐づく動画も非公開になります。',
    operation: 'delete',
    successText: 'タレントを削除しました。',
    title: 'タレントを削除',
  },
] as const

function renderDialog(
  operation: (typeof operations)[number]['operation'],
  onSuccess = vi.fn(),
) {
  render(
    <TalentLifecycleDialog
      onSuccess={onSuccess}
      operation={operation}
      talent={talent}
      trigger={<Button>開く</Button>}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: '開く' }))

  return { onSuccess }
}

describe('TalentLifecycleDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe.each(operations)('$operation', (config) => {
    it('shows the confirmation message', () => {
      renderDialog(config.operation)

      const dialog = screen.getByRole('dialog', { name: config.title })

      // Keep the line break: the default normalizer would collapse it.
      expect(
        within(dialog).getByText(config.description, {
          normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
        }),
      ).toBeInTheDocument()
    })

    it('does not run the action when cancelled', async () => {
      const { onSuccess } = renderDialog(config.operation)

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(config.action).not.toHaveBeenCalled()
      expect(onSuccess).not.toHaveBeenCalled()
    })

    it('runs the action for the talent and closes on success', async () => {
      config.action.mockResolvedValue({ success: true })
      const { onSuccess } = renderDialog(config.operation)

      fireEvent.click(screen.getByRole('button', { name: config.confirmLabel }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(config.action).toHaveBeenCalledTimes(1)
      expect(config.action).toHaveBeenCalledWith('talent-1')
      expect(onSuccess).toHaveBeenCalledWith(config.successText)
    })
  })

  it('keeps the dialog open and shows the error on failure', async () => {
    mocks.retireTalentAction.mockResolvedValue({
      error: '指定されたタレントが見つかりません。',
      success: false,
    })
    const { onSuccess } = renderDialog('retire')

    fireEvent.click(screen.getByRole('button', { name: '引退にする' }))

    expect(
      await screen.findByText('指定されたタレントが見つかりません。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('disables the buttons while the action is running', async () => {
    let resolve: (value: { success: boolean }) => void = () => {}
    mocks.deleteTalentAction.mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    renderDialog('delete')

    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByRole('button', { name: '削除中...' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()

    resolve({ success: true })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
