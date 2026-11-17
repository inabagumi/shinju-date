import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { FormStatus } from '../form-status'

describe('FormStatus', () => {
  test('shows the success message as a status', () => {
    render(
      <FormStatus state={{ message: '受け付けました。', success: true }} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('受け付けました。')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('shows the error as an alert', () => {
    render(
      <FormStatus
        state={{ error: '送信中にエラーが発生しました。', success: false }}
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      '送信中にエラーが発生しました。',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test.each([
    ['no state', null],
    [
      'only field errors',
      { fieldErrors: { message: '入力してください' }, success: false },
    ],
  ])('renders nothing for %s', (_, state) => {
    const { container } = render(<FormStatus state={state} />)

    expect(container).toBeEmptyDOMElement()
  })
})
