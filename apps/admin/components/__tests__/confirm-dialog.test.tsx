import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../confirm-dialog'

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
})
