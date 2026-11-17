import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  type ActionResult,
  ConfirmDialog,
  type ConfirmDialogProps,
} from './confirm-dialog'

function renderDialog() {
  const onConfirm = vi.fn()
  const onOpenChange = vi.fn()

  render(
    <ConfirmDialog
      confirmLabel="削除"
      confirmVariant="danger"
      description={'削除してもよろしいですか？\n元には戻せません。'}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open
      title="項目を削除"
    >
      <p>対象の名前</p>
    </ConfirmDialog>,
  )

  return { onConfirm, onOpenChange }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, reject, resolve }
}

type DialogOverrides = Partial<
  Pick<
    ConfirmDialogProps,
    'onConfirm' | 'onOpenChange' | 'pendingLabel' | 'requireKeyword'
  >
>

function renderWithTrigger(overrides: DialogOverrides = {}) {
  const onConfirm = vi.fn(overrides.onConfirm)

  render(
    <ConfirmDialog
      confirmLabel="削除"
      confirmVariant="danger"
      description="削除してもよろしいですか？"
      onConfirm={onConfirm}
      onOpenChange={overrides.onOpenChange}
      pendingLabel={overrides.pendingLabel}
      requireKeyword={overrides.requireKeyword}
      title="項目を削除"
      trigger={<button type="button">開く</button>}
    />,
  )

  const openDialog = () => {
    fireEvent.click(screen.getByRole('button', { name: '開く' }))
  }

  openDialog()

  return { onConfirm, openDialog }
}

describe('ConfirmDialog', () => {
  it('shows the message and the target', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('項目を削除')).toBeInTheDocument()
    expect(
      screen.getByText(/削除してもよろしいですか？\s*元には戻せません。/),
    ).toBeInTheDocument()
    expect(screen.getByText('対象の名前')).toBeInTheDocument()
  })

  it('closes without confirming when cancelled', () => {
    const { onConfirm, onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('closes and confirms when the confirm button is clicked', () => {
    const { onConfirm, onOpenChange } = renderDialog()

    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('manages the open state by itself when a trigger is given', () => {
    renderWithTrigger()

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('when onConfirm returns a promise', () => {
    it('disables the buttons while pending and closes on success', async () => {
      const deferred = createDeferred<ActionResult>()
      const onOpenChange = vi.fn()
      renderWithTrigger({ onConfirm: () => deferred.promise, onOpenChange })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '削除中...' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
      expect(onOpenChange).not.toHaveBeenCalledWith(false)

      await act(async () => {
        deferred.resolve({ success: true })
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('uses pendingLabel while pending', async () => {
      const deferred = createDeferred<void>()
      renderWithTrigger({
        onConfirm: () => deferred.promise,
        pendingLabel: '削除しています...',
      })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))

      expect(
        screen.getByRole('button', { name: '削除しています...' }),
      ).toBeDisabled()

      await act(async () => {
        deferred.resolve()
      })

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('does not close with Escape while pending', async () => {
      const deferred = createDeferred<void>()
      renderWithTrigger({ onConfirm: () => deferred.promise })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await act(async () => {
        deferred.resolve()
      })
    })

    it('keeps the dialog open and shows the error on failure', async () => {
      renderWithTrigger({
        onConfirm: async () => ({
          error: '削除できませんでした。',
          success: false,
        }),
      })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '削除できませんでした。',
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '削除' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeEnabled()
    })

    it('shows the fallback error when onConfirm throws', async () => {
      renderWithTrigger({
        onConfirm: async () => {
          throw new Error('network error')
        },
      })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        '処理に失敗しました。',
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('clears the error when the dialog is reopened', async () => {
      const { openDialog } = renderWithTrigger({
        onConfirm: async () => ({
          error: '削除できませんでした。',
          success: false,
        }),
      })

      fireEvent.click(screen.getByRole('button', { name: '削除' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      openDialog()

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('clears the error when reopened from outside', async () => {
      function Controlled() {
        const [open, setOpen] = useState(true)

        return (
          <>
            <button onClick={() => setOpen(true)} type="button">
              外から開く
            </button>
            <ConfirmDialog
              confirmLabel="削除"
              description="削除してもよろしいですか？"
              onConfirm={async () => ({ error: '失敗', success: false })}
              onOpenChange={setOpen}
              open={open}
              title="項目を削除"
            />
          </>
        )
      }

      render(<Controlled />)

      fireEvent.click(screen.getByRole('button', { name: '削除' }))
      expect(await screen.findByRole('alert')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '外から開く' }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('requireKeyword', () => {
    it('disables the confirm button until the keyword matches', () => {
      const { onConfirm } = renderWithTrigger({ requireKeyword: 'DELETE' })

      const confirmButton = screen.getByRole('button', { name: '削除' })
      const input = screen.getByLabelText(
        '続行するには「DELETE」と入力してください',
      )

      expect(confirmButton).toBeDisabled()

      fireEvent.change(input, { target: { value: 'delete' } })
      expect(confirmButton).toBeDisabled()

      fireEvent.click(confirmButton)
      expect(onConfirm).not.toHaveBeenCalled()

      fireEvent.change(input, { target: { value: 'DELETE' } })
      expect(confirmButton).toBeEnabled()

      fireEvent.click(confirmButton)
      expect(onConfirm).toHaveBeenCalledOnce()
    })

    it('clears the keyword when the dialog is reopened', () => {
      const { openDialog } = renderWithTrigger({ requireKeyword: 'DELETE' })

      fireEvent.change(
        screen.getByLabelText('続行するには「DELETE」と入力してください'),
        { target: { value: 'DELETE' } },
      )
      fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

      openDialog()

      expect(
        screen.getByLabelText('続行するには「DELETE」と入力してください'),
      ).toHaveValue('')
      expect(screen.getByRole('button', { name: '削除' })).toBeDisabled()
    })
  })

  describe('size', () => {
    function renderWithSize(size?: ConfirmDialogProps['size']) {
      render(
        <ConfirmDialog
          confirmLabel="削除"
          description="削除してもよろしいですか？"
          onConfirm={vi.fn()}
          onOpenChange={vi.fn()}
          open
          size={size}
          title="項目を削除"
        />,
      )

      return screen.getByRole('dialog')
    }

    it('uses the default width when omitted', () => {
      const dialog = renderWithSize()

      expect(dialog).toHaveClass('overflow-y-auto')
      expect(dialog).not.toHaveClass('max-w-lg')
    })

    it('uses the wider width for lg', () => {
      const dialog = renderWithSize('lg')

      expect(dialog).toHaveClass('max-w-lg', 'overflow-y-auto')
    })
  })
})
