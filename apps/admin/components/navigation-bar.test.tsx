import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'

const mocks = vi.hoisted(() => ({
  pathname: '/videos',
  signOutAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  unstable_rethrow: vi.fn(),
  usePathname: () => mocks.pathname,
}))

vi.mock('@/app/login/_actions/sign-out', () => ({
  signOutAction: mocks.signOutAction,
}))

const { NavigationBar } = await import('./navigation-bar')

function renderNavigationBar() {
  return render(
    <ActionToastProvider>
      <NavigationBar />
      <main>
        <button type="button">ページの中</button>
      </main>
    </ActionToastProvider>,
  )
}

describe('NavigationBar', () => {
  beforeEach(() => {
    mocks.signOutAction.mockReset()
  })

  it('does not open the menu on hover', async () => {
    const user = userEvent.setup()

    renderNavigationBar()

    await user.hover(screen.getByRole('button', { name: 'データ管理' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens the menu with a click and marks the current page', async () => {
    const user = userEvent.setup()

    renderNavigationBar()

    await user.click(screen.getByRole('button', { name: 'データ管理' }))

    const current = screen.getByRole('menuitem', { name: '動画管理' })

    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(current).toHaveAttribute('href', '/videos')
    expect(current).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('menuitem', { name: 'タレント管理' }),
    ).not.toHaveAttribute('aria-current')
  })

  it('moves between the links with the arrow keys', async () => {
    const user = userEvent.setup()

    renderNavigationBar()

    screen.getByRole('button', { name: 'アナリティクス' }).focus()
    await user.keyboard('{Enter}')

    expect(
      screen.getByRole('menuitem', { name: '検索アナリティクス' }),
    ).toHaveFocus()

    await user.keyboard('{ArrowDown}')

    expect(
      screen.getByRole('menuitem', { name: 'クリックアナリティクス' }),
    ).toHaveFocus()
  })

  it('closes with the Escape key and returns the focus to the button', async () => {
    const user = userEvent.setup()

    renderNavigationBar()

    const trigger = screen.getByRole('button', { name: 'データ管理' })

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes when clicking outside', async () => {
    // 開いている間は外側の要素が `pointer-events: none` になるため、検査を外す
    const user = userEvent.setup({ pointerEventsCheck: 0 })

    renderNavigationBar()

    await user.click(screen.getByRole('button', { name: 'データ管理' }))
    await user.click(screen.getByText('ページの中'))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('signs out from the user menu', async () => {
    const user = userEvent.setup()

    const result = Promise.withResolvers<object>()

    mocks.signOutAction.mockReturnValue(result.promise)
    renderNavigationBar()

    await user.click(screen.getByRole('button', { name: 'ユーザーメニュー' }))
    await user.click(screen.getByRole('menuitem', { name: 'ログアウト' }))

    const item = screen.getByRole('menuitem', { name: 'ログアウト' })

    expect(mocks.signOutAction).toHaveBeenCalledTimes(1)
    // 終わるまでメニューを開いたままにし、項目を無効にする
    expect(item).toHaveAttribute('aria-disabled', 'true')

    // 終わらないままだと、ほかのテストの transition も終わらなくなる
    await act(async () => {
      result.resolve({})
    })

    expect(item).not.toHaveAttribute('aria-disabled')
  })

  it('shows a toast when signing out fails', async () => {
    const user = userEvent.setup()

    mocks.signOutAction.mockResolvedValue({
      errors: { generic: ['ログアウトに失敗しました。'] },
    })
    renderNavigationBar()

    await user.click(screen.getByRole('button', { name: 'ユーザーメニュー' }))
    await user.click(screen.getByRole('menuitem', { name: 'ログアウト' }))

    expect(
      await screen.findByText('ログアウトに失敗しました。'),
    ).toBeInTheDocument()
  })
})
