import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchInput } from '../search-input'

const mocks = vi.hoisted(() => ({
  pathname: '/talents',
  push: vi.fn(),
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}))

function getInput() {
  return screen.getByRole('searchbox', { name: '検索' }) as HTMLInputElement
}

/** URL のパラメータが変わったときの再描画 */
function navigate(
  rerender: ReturnType<typeof render>['rerender'],
  search: string,
) {
  mocks.searchParams = new URLSearchParams(search)
  rerender(<SearchInput aria-label="検索" />)
}

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.pathname = '/talents'
    mocks.searchParams = new URLSearchParams()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the search of the URL', () => {
    mocks.searchParams = new URLSearchParams('search=abc')

    render(<SearchInput aria-label="検索" />)

    expect(getInput()).toHaveValue('abc')
  })

  it('updates the URL after the input stops', () => {
    mocks.searchParams = new URLSearchParams('status=all&page=2')
    render(<SearchInput aria-label="検索" />)

    fireEvent.change(getInput(), { target: { value: 'a' } })
    fireEvent.change(getInput(), { target: { value: 'abc' } })

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(mocks.replace).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(mocks.replace).toHaveBeenCalledTimes(1)
    expect(mocks.replace).toHaveBeenCalledWith('/talents?status=all&search=abc')
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('removes the parameter when the input is cleared', () => {
    mocks.searchParams = new URLSearchParams('search=abc')
    render(<SearchInput aria-label="検索" />)

    fireEvent.change(getInput(), { target: { value: '  ' } })
    act(() => {
      vi.runAllTimers()
    })

    expect(mocks.replace).toHaveBeenCalledWith('/talents')
  })

  it('uses the given parameter name', () => {
    render(<SearchInput aria-label="検索" paramName="q" />)

    fireEvent.change(getInput(), { target: { value: 'abc' } })
    act(() => {
      vi.runAllTimers()
    })

    expect(mocks.replace).toHaveBeenCalledWith('/talents?q=abc')
  })

  it('keeps the other parameters that change while waiting', () => {
    const { rerender } = render(<SearchInput aria-label="検索" />)

    fireEvent.change(getInput(), { target: { value: 'abc' } })
    navigate(rerender, 'status=retired')
    act(() => {
      vi.runAllTimers()
    })

    expect(getInput()).toHaveValue('abc')
    expect(mocks.replace).toHaveBeenCalledWith(
      '/talents?status=retired&search=abc',
    )
  })

  it('follows the URL when it changes outside the input', () => {
    mocks.searchParams = new URLSearchParams('search=B')
    const { rerender } = render(<SearchInput aria-label="検索" />)

    navigate(rerender, 'search=A')

    expect(getInput()).toHaveValue('A')

    act(() => {
      vi.runAllTimers()
    })
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('does not write back the input after the URL changes', () => {
    const { rerender } = render(<SearchInput aria-label="検索" />)

    fireEvent.change(getInput(), { target: { value: 'abc' } })
    navigate(rerender, 'search=other')
    act(() => {
      vi.runAllTimers()
    })

    expect(getInput()).toHaveValue('other')
    expect(mocks.replace).not.toHaveBeenCalled()
  })

  it('keeps the input when the URL catches up with its own update', () => {
    const { rerender } = render(<SearchInput aria-label="検索" />)

    fireEvent.change(getInput(), { target: { value: 'ab' } })
    act(() => {
      vi.runAllTimers()
    })
    fireEvent.change(getInput(), { target: { value: 'abc' } })
    navigate(rerender, 'search=ab')

    expect(getInput()).toHaveValue('abc')

    act(() => {
      vi.runAllTimers()
    })
    expect(mocks.replace).toHaveBeenLastCalledWith('/talents?search=abc')
  })
})
