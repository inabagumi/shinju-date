import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from '../Input/Input'
import { Select } from './Select'

describe('Select', () => {
  it('lets the user choose an option', async () => {
    const user = userEvent.setup()

    render(
      <Select aria-label="並び順" defaultValue="new">
        <option value="new">新しい順</option>
        <option value="old">古い順</option>
      </Select>,
    )

    const select = screen.getByRole('combobox', { name: '並び順' })

    await user.selectOptions(select, 'old')

    expect(select).toHaveValue('old')
  })

  it('shares the border, radius and padding of Input', () => {
    render(
      <>
        <Input aria-label="キーワード" variant="error" />
        <Select aria-label="並び順" variant="error" />
      </>,
    )

    const input = screen.getByRole('textbox')
    const select = screen.getByRole('combobox')

    for (const className of input.className.split(' ')) {
      if (className !== 'px-4') {
        expect(select).toHaveClass(className)
      }
    }

    expect(select).toHaveClass('appearance-none', 'pr-10')
  })

  it('keeps the arrow image when a style is given', () => {
    render(<Select aria-label="並び順" style={{ width: '10rem' }} />)

    const select = screen.getByRole('combobox')

    expect(select.style.width).toBe('10rem')
    expect(select.style.backgroundImage).toContain('data:image/svg+xml')
  })
})
