import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button/Button'
import { FIELD_FOCUS_RING, FIELD_FOCUS_RING_DANGER, FOCUS_RING } from './focus'
import { Input } from './Input/Input'
import { MultiSelect } from './MultiSelect/MultiSelect'
import { Select } from './Select/Select'
import { Textarea } from './Textarea/Textarea'
import { ToastClose, ToastProvider } from './Toast/Toast'

function classesOf(classNames: string): string[] {
  return classNames.split(' ')
}

describe('focus styles', () => {
  it('gives buttons the focus ring', () => {
    render(<Button>保存</Button>)

    expect(screen.getByRole('button')).toHaveClass(...classesOf(FOCUS_RING))
  })

  it('gives the toast close button the focus ring', () => {
    render(
      <ToastProvider>
        <ToastClose aria-label="閉じる" />
      </ToastProvider>,
    )

    expect(screen.getByRole('button')).toHaveClass(...classesOf(FOCUS_RING))
  })

  it('gives every field the same focus ring', () => {
    render(
      <>
        <Input aria-label="入力欄" />
        <Select aria-label="セレクトボックス">
          <option>選択肢</option>
        </Select>
        <Textarea aria-label="複数行の入力欄" />
        <MultiSelect onChange={vi.fn()} options={[]} value={[]} />
      </>,
    )

    for (const field of [
      screen.getByRole('textbox', { name: '入力欄' }),
      screen.getByRole('combobox', { name: 'セレクトボックス' }),
      screen.getByRole('textbox', { name: '複数行の入力欄' }),
      screen.getByRole('button'),
    ]) {
      expect(field).toHaveClass(...classesOf(FIELD_FOCUS_RING))
      // `outline-none` は `outline-2` の線の種類を `none` にし、線を消す
      expect(field).not.toHaveClass('outline-none')
    }
  })

  it('switches the field focus ring to danger for errors', () => {
    render(
      <>
        <Input aria-label="入力欄" variant="danger" />
        <Textarea aria-label="複数行の入力欄" variant="danger" />
      </>,
    )

    for (const name of ['入力欄', '複数行の入力欄']) {
      const field = screen.getByRole('textbox', { name })

      expect(field).toHaveClass(...classesOf(FIELD_FOCUS_RING_DANGER))
      expect(field).not.toHaveClass('focus-visible:outline-accent')
    }
  })
})
