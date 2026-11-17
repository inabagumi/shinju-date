import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Form, {
  ErrorMessage,
  FormField,
  type FormState,
  Input,
  Label,
  Select,
  SubmitButton,
  SuccessMessage,
} from './form'

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

function renderForm(action: () => FormState | Promise<FormState>) {
  render(
    <Form action={action}>
      <FormField name="email">
        <Label>メールアドレス</Label>
        <Input />
        <ErrorMessage />
      </FormField>
      <SuccessMessage />
      <SubmitButton>保存</SubmitButton>
    </Form>,
  )
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: '保存' }))
}

describe('Form', () => {
  it('shows `error` of the state at the top of the form', async () => {
    renderForm(() => ({ error: '保存に失敗しました。' }))

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('保存に失敗しました。')
    expect(alert.closest('form')?.firstElementChild).toBe(alert)
  })

  it('shows `errors.generic` of the state at the top of the form', async () => {
    renderForm(() => ({
      errors: { generic: ['入力された値が正しくありません。'] },
    }))

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('入力された値が正しくありません。')
    expect(alert.closest('form')?.firstElementChild).toBe(alert)
  })

  it('shows both `error` and `errors.generic` in one message', async () => {
    renderForm(() => ({
      error: '保存に失敗しました。',
      errors: { generic: ['時間をおいてもう一度お試しください。'] },
    }))

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('保存に失敗しました。')
    expect(alert).toHaveTextContent('時間をおいてもう一度お試しください。')
  })

  it('shows nothing before submitting', () => {
    renderForm(() => ({}))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows the success message when `success` is true', async () => {
    renderForm(() => ({ success: true }))

    submit()

    expect(await screen.findByRole('status')).toHaveTextContent(
      '更新が完了しました。',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('Form after a failed submission', () => {
  function renderFieldsForm(
    action: (
      currentState: FormState,
      formData: FormData,
    ) => FormState | Promise<FormState>,
  ) {
    render(
      <Form action={action}>
        <FormField name="level">
          <Label>レベル</Label>
          <Select defaultValue="info">
            <option value="info">情報</option>
            <option value="alert">重要</option>
          </Select>
          <ErrorMessage />
        </FormField>
        {/* 制御されていない入力欄 */}
        <label>
          <input
            defaultChecked={false}
            name="enabled"
            type="checkbox"
            value="true"
          />
          有効化
        </label>
        <label>
          メモ
          <input defaultValue="" name="note" />
        </label>
        <SubmitButton>保存</SubmitButton>
      </Form>,
    )
  }

  it('keeps the select, the checkbox and uncontrolled inputs', async () => {
    const action = vi.fn<
      (currentState: FormState, formData: FormData) => FormState
    >(() => ({ errors: { level: ['レベルが正しくありません。'] } }))
    renderFieldsForm(action)

    fireEvent.change(screen.getByLabelText('レベル'), {
      target: { value: 'alert' },
    })
    fireEvent.click(screen.getByLabelText('有効化'))
    fireEvent.change(screen.getByLabelText('メモ'), {
      target: { value: 'メモの内容' },
    })
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'レベルが正しくありません。',
    )
    expect(screen.getByLabelText('レベル')).toHaveValue('alert')
    expect(screen.getByLabelText('有効化')).toBeChecked()
    expect(screen.getByLabelText('メモ')).toHaveValue('メモの内容')

    // そのまま送り直すと、選んだ内容が送られる
    submit()

    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(2))
    const formData = action.mock.calls[1]?.[1]
    expect(formData?.get('level')).toBe('alert')
    expect(formData?.get('enabled')).toBe('true')
    expect(formData?.get('note')).toBe('メモの内容')
  })

  it('includes the value of the submit button', async () => {
    const action = vi.fn<
      (currentState: FormState, formData: FormData) => FormState
    >(() => ({}))
    render(
      <Form action={action}>
        <SubmitButton name="intent" value="save">
          保存
        </SubmitButton>
      </Form>,
    )

    submit()

    await vi.waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(action.mock.calls[0]?.[1].get('intent')).toBe('save')
  })

  it('disables the fields and the submit button while submitting', async () => {
    const deferred = createDeferred<FormState>()
    renderFieldsForm(() => deferred.promise)

    submit()

    const button = screen.getByRole('button', { name: '保存' })
    await vi.waitFor(() => expect(button).toBeDisabled())
    expect(screen.getByLabelText('レベル')).toBeDisabled()

    await act(async () => {
      deferred.resolve({ error: '保存に失敗しました。' })
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '保存に失敗しました。',
    )
    expect(button).toBeEnabled()
    expect(screen.getByLabelText('レベル')).toBeEnabled()
  })
})

describe('ErrorMessage', () => {
  it('shows the error of a field next to the field', async () => {
    renderForm(() => ({
      errors: { email: ['メールアドレスを入力してください。'] },
    }))

    submit()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('メールアドレスを入力してください。')
    expect(alert).toHaveClass('mt-1', 'text-meta', 'text-danger')

    const input = screen.getByLabelText('メールアドレス')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', alert.id)
  })
})

describe('SubmitButton', () => {
  it('submits the form by default', () => {
    render(
      <form>
        <SubmitButton>保存</SubmitButton>
      </form>,
    )

    expect(screen.getByRole('button', { name: '保存' })).toHaveAttribute(
      'type',
      'submit',
    )
  })
})

describe('Label', () => {
  it('has the default classes', () => {
    render(
      <FormField name="email">
        <Label>メールアドレス</Label>
      </FormField>,
    )

    expect(screen.getByText('メールアドレス')).toHaveClass(
      'mb-2',
      'block',
      'text-meta',
      'font-semibold',
    )
  })

  it('lets `className` override the default classes', () => {
    render(
      <FormField name="enabled">
        <Label className="mb-0 flex items-center gap-2">
          <input name="enabled" type="checkbox" />
          有効化
        </Label>
      </FormField>,
    )

    const label = screen.getByText('有効化')
    expect(label).toHaveClass('mb-0', 'flex', 'text-meta', 'font-semibold')
    expect(label).not.toHaveClass('mb-2', 'block')
  })
})
