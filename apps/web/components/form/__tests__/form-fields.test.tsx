import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { InputField, SelectField, TextareaField } from '../form-fields'

describe('form fields', () => {
  test('InputField passes required to the input', () => {
    render(<InputField label="メールアドレス" name="email" required />)

    expect(screen.getByLabelText(/メールアドレス/)).toBeRequired()
  })

  test('TextareaField passes required to the textarea', () => {
    render(<TextareaField label="機能要望" name="message" required />)

    expect(screen.getByLabelText(/機能要望/)).toBeRequired()
  })

  test('SelectField passes required to the select', () => {
    render(
      <SelectField label="お問い合わせ種別" name="type" required>
        <option value="">選択してください</option>
      </SelectField>,
    )

    expect(screen.getByLabelText(/お問い合わせ種別/)).toBeRequired()
  })

  test('fields are not required by default', () => {
    render(<TextareaField label="機能要望" name="message" />)

    expect(screen.getByLabelText('機能要望')).not.toBeRequired()
  })

  test('associates the error message with the field', () => {
    render(
      <TextareaField
        error="機能要望を入力してください"
        label="機能要望"
        name="message"
        required
      />,
    )

    const textarea = screen.getByLabelText(/機能要望/)

    expect(textarea).toBeInvalid()
    expect(textarea).toHaveAccessibleDescription('機能要望を入力してください')
  })
})
