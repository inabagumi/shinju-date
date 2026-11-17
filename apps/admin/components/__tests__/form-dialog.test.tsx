import { Button } from '@shinju-date/ui'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorMessage, FormField, type FormState, Input, Label } from '../form'
import { FormDialog, type FormDialogProps } from '../form-dialog'

type Action = FormDialogProps['action']

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, reject, resolve }
}

function renderDialog(
  action: Action,
  overrides: Partial<
    Pick<FormDialogProps, 'description' | 'onSuccess' | 'size'>
  > = {},
) {
  const actionMock = vi.fn(action)

  render(
    <FormDialog
      action={actionMock}
      submitLabel="追加"
      title="用語を追加"
      trigger={<Button>開く</Button>}
      {...overrides}
    >
      <FormField name="term">
        <Label>用語</Label>
        <Input defaultValue="初期値" />
        <ErrorMessage />
      </FormField>
    </FormDialog>,
  )

  return { action: actionMock }
}

function openDialog() {
  fireEvent.click(screen.getByRole('button', { name: '開く' }))

  return screen.getByRole('dialog', { name: '用語を追加' })
}

function getTermInput(dialog: HTMLElement) {
  return within(dialog).getByRole<HTMLInputElement>('textbox', { name: '用語' })
}

function submit(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole('button', { name: '追加' }))
}

describe('FormDialog', () => {
  it('opens with the trigger and shows the title and the fields', () => {
    renderDialog(() => ({ success: true }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const dialog = openDialog()

    expect(getTermInput(dialog)).toHaveValue('初期値')
    expect(
      within(dialog).getByRole('button', { name: 'キャンセル' }),
    ).toBeEnabled()
    expect(within(dialog).getByRole('button', { name: '追加' })).toBeEnabled()
  })

  it('describes the dialog with the description', () => {
    renderDialog(() => ({ success: true }), {
      description: '検索に使う用語を追加します。',
    })

    expect(openDialog()).toHaveAccessibleDescription(
      '検索に使う用語を追加します。',
    )
  })

  it('does not warn about a missing description', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    try {
      renderDialog(() => ({ success: true }))

      expect(openDialog()).not.toHaveAttribute('aria-describedby')
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('widens the dialog with `size="lg"`', () => {
    renderDialog(() => ({ success: true }), { size: 'lg' })

    expect(openDialog()).toHaveClass('max-w-lg')
  })

  it('passes the form data to the action', async () => {
    const { action } = renderDialog(() => ({ success: true }))

    const dialog = openDialog()

    fireEvent.change(getTermInput(dialog), { target: { value: '歌枠' } })
    submit(dialog)

    await waitFor(() => expect(action).toHaveBeenCalledOnce())

    const [currentState, formData] = action.mock.calls[0] ?? []

    expect(currentState).toEqual({})
    expect((formData as FormData).get('term')).toBe('歌枠')
  })

  it('closes and calls `onSuccess` when the action succeeds', async () => {
    const onSuccess = vi.fn()

    renderDialog(() => ({ success: true }), { onSuccess })

    submit(openDialog())

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(onSuccess).toHaveBeenCalledOnce()
  })

  it('stays open and shows the message on a validation error', async () => {
    const onSuccess = vi.fn()

    renderDialog(() => ({ errors: { term: ['用語を入力してください。'] } }), {
      onSuccess,
    })

    const dialog = openDialog()

    submit(dialog)

    expect(
      await within(dialog).findByText('用語を入力してください。'),
    ).toBeInTheDocument()
    expect(getTermInput(dialog)).toBeInvalid()
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it.each<[string, FormState]>([
    ['`error`', { error: '用語の追加に失敗しました。' }],
    [
      '`errors.generic`',
      { errors: { generic: ['用語の追加に失敗しました。'] } },
    ],
    // 成功を示す値がなければ、エラーがなくても閉じない
    ['an empty state', {}],
  ])('stays open when the action returns %s', async (_name, state) => {
    const onSuccess = vi.fn()
    const { action } = renderDialog(() => state, { onSuccess })

    const dialog = openDialog()

    submit(dialog)

    await waitFor(() => expect(action).toHaveBeenCalledOnce())

    const message = state.error ?? state.errors?.['generic']?.[0]

    if (message) {
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        message,
      )
    }

    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: '追加' }),
      ).toBeEnabled(),
    )
    expect(screen.getByRole('dialog')).toBe(dialog)
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('resets the fields and the errors when opened again after a failure', async () => {
    renderDialog(() => ({
      error: '用語の追加に失敗しました。',
      errors: { term: ['用語が長すぎます。'] },
    }))

    const dialog = openDialog()

    fireEvent.change(getTermInput(dialog), { target: { value: '長い用語' } })
    submit(dialog)

    expect(
      await within(dialog).findByText('用語の追加に失敗しました。'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('用語が長すぎます。')).toBeInTheDocument()
    expect(getTermInput(dialog)).toHaveValue('長い用語')

    fireEvent.click(within(dialog).getByRole('button', { name: 'キャンセル' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    const reopened = openDialog()

    expect(getTermInput(reopened)).toHaveValue('初期値')
    expect(getTermInput(reopened)).toBeValid()
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()
    expect(
      within(reopened).queryByText('用語が長すぎます。'),
    ).not.toBeInTheDocument()
  })

  it('resets the fields when opened again after a success', async () => {
    renderDialog(() => ({ success: true }))

    const dialog = openDialog()

    fireEvent.change(getTermInput(dialog), { target: { value: '歌枠' } })
    submit(dialog)

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    const reopened = openDialog()

    expect(getTermInput(reopened)).toHaveValue('初期値')
    expect(within(reopened).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not close with Escape, an outside click or the cancel button while submitting', async () => {
    const deferred = createDeferred<FormState>()

    renderDialog(() => deferred.promise)

    const dialog = openDialog()

    submit(dialog)

    const cancelButton = within(dialog).getByRole('button', {
      name: 'キャンセル',
    })

    await waitFor(() => expect(cancelButton).toBeDisabled())
    expect(within(dialog).getByRole('button', { name: '追加' })).toBeDisabled()

    fireEvent.keyDown(dialog, { code: 'Escape', key: 'Escape' })
    fireEvent.pointerDown(document.body)
    fireEvent.click(cancelButton)

    expect(screen.getByRole('dialog')).toBe(dialog)

    await act(async () => {
      deferred.resolve({ success: true })
      await deferred.promise
    })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })

  it('closes with Escape or the cancel button again after a failed submission', async () => {
    const deferred = createDeferred<FormState>()

    renderDialog(() => deferred.promise)

    const dialog = openDialog()

    submit(dialog)

    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', { name: 'キャンセル' }),
      ).toBeDisabled(),
    )

    await act(async () => {
      deferred.resolve({ error: '用語の追加に失敗しました。' })
      await deferred.promise
    })

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { code: 'Escape', key: 'Escape' })

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
  })
})
