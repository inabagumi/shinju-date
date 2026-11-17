import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SortableInputList } from './sortable-input-list'

const placeholder = '読み方を入力'

function getInputs() {
  return screen.getAllByPlaceholderText<HTMLInputElement>(placeholder)
}

function getInputValues() {
  return getInputs().map((input) => input.value)
}

function renderInForm(defaultValues?: string[]) {
  const { container } = render(
    <form>
      <input name="term" readOnly type="hidden" value="SHINJU" />
      <SortableInputList
        addButtonLabel="読み方を追加"
        name="readings"
        placeholder={placeholder}
        {...(defaultValues ? { defaultValues } : {})}
      />
    </form>,
  )
  const form = container.querySelector('form')

  if (!form) {
    throw new Error('The form is missing.')
  }

  return form
}

function getSubmittedEntries(form: HTMLFormElement) {
  return [...new FormData(form).entries()]
}

function paste(input: HTMLInputElement, text: string) {
  return fireEvent.paste(input, {
    clipboardData: { getData: () => text },
  })
}

describe('SortableInputList', () => {
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect

  beforeAll(() => {
    // jsdom はレイアウトを計算しないため、キーボードでの並べ替えに必要な
    // 位置を、兄弟要素の中の順番から決める
    HTMLElement.prototype.getBoundingClientRect = function () {
      const siblings = this.parentElement
        ? [...this.parentElement.children]
        : []
      const index = Math.max(siblings.indexOf(this), 0)

      return new DOMRect(0, index * 40, 300, 40)
    }
  })

  afterAll(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  it('renders one empty input without the remove button by default', () => {
    renderInForm()

    expect(getInputValues()).toEqual([''])
    expect(
      screen.queryByRole('button', { name: '削除' }),
    ).not.toBeInTheDocument()
  })

  it('renders an input for each default value', () => {
    renderInForm(['しんじゅ', 'シンジュ'])

    expect(getInputValues()).toEqual(['しんじゅ', 'シンジュ'])
    expect(screen.getAllByRole('button', { name: '削除' })).toHaveLength(2)
  })

  it('adds and removes inputs', () => {
    renderInForm(['しんじゅ'])

    fireEvent.click(screen.getByRole('button', { name: '読み方を追加' }))

    expect(getInputValues()).toEqual(['しんじゅ', ''])

    fireEvent.change(getInputs()[1] as HTMLInputElement, {
      target: { value: 'シンジュ' },
    })

    expect(getInputValues()).toEqual(['しんじゅ', 'シンジュ'])

    const [firstRemoveButton] = screen.getAllByRole('button', { name: '削除' })
    fireEvent.click(firstRemoveButton as HTMLElement)

    expect(getInputValues()).toEqual(['シンジュ'])
    // 入力欄が1つのときは削除のボタンを出さない
    expect(
      screen.queryByRole('button', { name: '削除' }),
    ).not.toBeInTheDocument()
  })

  it('does not submit the form with the add button', () => {
    const form = renderInForm()
    let submitted = false
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      submitted = true
    })

    fireEvent.click(screen.getByRole('button', { name: '読み方を追加' }))

    expect(submitted).toBe(false)
  })

  describe('pasting', () => {
    it('splits multiple lines into an input for each line', () => {
      renderInForm(['あ', 'い'])

      const event = paste(
        getInputs()[0] as HTMLInputElement,
        'しんじゅ\nシンジュ\n真珠',
      )

      // 既定の貼り付けを止め、1行目を貼り付けた入力欄に、残りをその後ろに入れる
      expect(event).toBe(false)
      expect(getInputValues()).toEqual(['しんじゅ', 'シンジュ', '真珠', 'い'])
    })

    it('skips blank lines', () => {
      renderInForm()

      paste(getInputs()[0] as HTMLInputElement, 'しんじゅ\n\n  \nシンジュ\n')

      expect(getInputValues()).toEqual(['しんじゅ', 'シンジュ'])
    })

    it('leaves the inputs as they are when every line is blank', () => {
      renderInForm(['しんじゅ'])

      const event = paste(getInputs()[0] as HTMLInputElement, '  \n\n  ')

      expect(event).toBe(false)
      expect(getInputValues()).toEqual(['しんじゅ'])
    })

    it('leaves a single line to the default paste', () => {
      renderInForm(['しんじゅ'])

      const event = paste(getInputs()[0] as HTMLInputElement, 'シンジュ')

      expect(event).toBe(true)
      expect(getInputValues()).toEqual(['しんじゅ'])
    })
  })

  it('reorders inputs with the keyboard', async () => {
    renderInForm(['しんじゅ', 'シンジュ', '真珠'])

    const [firstHandle] = screen.getAllByRole('button', {
      name: 'ドラッグして並び替え',
    })

    if (!firstHandle) {
      throw new Error('The drag handle of the first input is missing.')
    }

    firstHandle.focus()

    // dnd-kit はキーを押すたびに位置を測り直すため、1回ずつ反映を待つ
    for (const code of ['Space', 'ArrowDown', 'Space']) {
      await act(async () => {
        fireEvent.keyDown(firstHandle, { code })
        await new Promise((resolve) => requestAnimationFrame(resolve))
      })
    }

    await waitFor(() => {
      expect(getInputValues()).toEqual(['シンジュ', 'しんじゅ', '真珠'])
    })
  })

  it('submits the values as name[index] in the displayed order', () => {
    const form = renderInForm(['しんじゅ'])

    fireEvent.click(screen.getByRole('button', { name: '読み方を追加' }))
    paste(getInputs()[1] as HTMLInputElement, 'シンジュ\n真珠')

    expect(getSubmittedEntries(form)).toEqual([
      ['term', 'SHINJU'],
      ['readings[0]', 'しんじゅ'],
      ['readings[1]', 'シンジュ'],
      ['readings[2]', '真珠'],
    ])
  })

  it('submits an empty value for the empty input', () => {
    const form = renderInForm()

    expect(getSubmittedEntries(form)).toEqual([
      ['term', 'SHINJU'],
      ['readings[0]', ''],
    ])
  })
})
