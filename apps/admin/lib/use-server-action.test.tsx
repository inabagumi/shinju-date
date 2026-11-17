import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import {
  SERVER_ACTION_FALLBACK_ERROR,
  type ServerActionResult,
  type UseServerActionOptions,
  useServerAction,
} from './use-server-action'

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })

  return { promise, resolve }
}

interface WrapperProps {
  children: ReactNode
}

function Wrapper({ children }: WrapperProps) {
  return <ActionToastProvider>{children}</ActionToastProvider>
}

function renderServerAction<
  TArgs extends unknown[],
  TResult extends ServerActionResult,
>(
  action: (...args: TArgs) => Promise<TResult>,
  options?: UseServerActionOptions<TResult>,
) {
  return renderHook(() => useServerAction(action, options), {
    wrapper: Wrapper,
  })
}

/** トーストは、`ToastViewport`（`role="region"`）の中のリストの項目として描かれる */
function getToasts() {
  return within(screen.getByRole('region')).queryAllByRole('listitem')
}

describe('useServerAction', () => {
  it('passes the arguments to the action and shows the success text', async () => {
    const action = vi.fn(async (_id: string, _value: number) => ({
      success: true,
    }))
    const onSuccess = vi.fn()
    const { result } = renderServerAction(action, {
      onSuccess,
      successText: '表示状態を更新しました。',
    })

    let returned: ServerActionResult | undefined
    await act(async () => {
      returned = await result.current.run('video-1', 2)
    })

    expect(action).toHaveBeenCalledWith('video-1', 2)
    expect(returned).toEqual({ success: true })
    expect(onSuccess).toHaveBeenCalledWith({ success: true })
    expect(
      await screen.findByText('表示状態を更新しました。'),
    ).toBeInTheDocument()
  })

  it('builds the success text from the result', async () => {
    const action = vi.fn(async () => ({
      message: 'チャンネル情報は既に最新です。',
      success: true,
    }))
    const { result } = renderServerAction(action, {
      successText: (actionResult) => actionResult.message,
    })

    await act(async () => {
      await result.current.run()
    })

    expect(
      await screen.findByText('チャンネル情報は既に最新です。'),
    ).toBeInTheDocument()
  })

  it('shows no toast on success without successText', async () => {
    const action = vi.fn(async () => ({ success: true }))
    const { result } = renderServerAction(action)

    await act(async () => {
      await result.current.run()
    })

    expect(action).toHaveBeenCalledOnce()
    expect(getToasts()).toHaveLength(0)
  })

  it('shows the returned error on failure without calling onSuccess', async () => {
    const action = vi.fn(async () => ({
      error: '指定されたタレントが見つかりません。',
      success: false,
    }))
    const onSuccess = vi.fn()
    const { result } = renderServerAction(action, {
      onSuccess,
      successText: '削除しました。',
    })

    await act(async () => {
      await result.current.run()
    })

    expect(
      await screen.findByText('指定されたタレントが見つかりません。'),
    ).toBeInTheDocument()
    expect(screen.queryByText('削除しました。')).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('shows errorText when the failure has no error', async () => {
    const action = vi.fn(async () => ({ success: false }))
    const { result } = renderServerAction(action, {
      errorText: '同期に失敗しました。',
    })

    await act(async () => {
      await result.current.run()
    })

    expect(await screen.findByText('同期に失敗しました。')).toBeInTheDocument()
  })

  it('shows a warning toast for each warning', async () => {
    const action = vi.fn(async () => ({
      success: true,
      warnings: ['1件は更新できませんでした。', '監査ログを残せませんでした。'],
    }))
    const { result } = renderServerAction(action, {
      successText: '更新しました。',
    })

    await act(async () => {
      await result.current.run()
    })

    expect(await screen.findByText('更新しました。')).toBeInTheDocument()
    expect(screen.getByText('1件は更新できませんでした。')).toBeInTheDocument()
    expect(screen.getByText('監査ログを残せませんでした。')).toBeInTheDocument()
    expect(getToasts()).toHaveLength(3)
  })

  it('shows the fallback error when the action throws', async () => {
    const action = vi.fn(async () => {
      throw new Error('connection reset')
    })
    const onSuccess = vi.fn()
    const { result } = renderServerAction<[], ServerActionResult>(action, {
      onSuccess,
      successText: '更新しました。',
    })

    let returned: ServerActionResult | undefined = { success: true }
    await act(async () => {
      returned = await result.current.run()
    })

    expect(returned).toBeUndefined()
    expect(
      await screen.findByText(SERVER_ACTION_FALLBACK_ERROR),
    ).toBeInTheDocument()
    expect(screen.queryByText('connection reset')).not.toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('is pending while the action runs', async () => {
    const deferred = createDeferred<ServerActionResult>()
    const action = vi.fn(() => deferred.promise)
    const { result } = renderServerAction(action)

    expect(result.current.isPending).toBe(false)

    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.run()
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    await act(async () => {
      deferred.resolve({ success: true })
      await pending
    })

    expect(result.current.isPending).toBe(false)
  })

  it('throws when used outside ActionToastProvider', () => {
    function Component() {
      useServerAction(async () => ({ success: true }))
      return null
    }

    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Component />)).toThrow(
      'useActionToast must be used within an ActionToastProvider.',
    )
  })
})
