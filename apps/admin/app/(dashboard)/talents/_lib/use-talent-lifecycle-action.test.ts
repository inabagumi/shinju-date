import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTalentLifecycleAction } from './use-talent-lifecycle-action'

const refresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}))

describe('useTalentLifecycleAction', () => {
  const confirmSpy = vi.spyOn(window, 'confirm')

  beforeEach(() => {
    vi.clearAllMocks()
    confirmSpy.mockReturnValue(true)
  })

  it('should not run the action when the confirmation is cancelled', () => {
    confirmSpy.mockReturnValue(false)
    const action = vi.fn()
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, { confirmMessage: '削除しますか？' })
    })

    expect(confirmSpy).toHaveBeenCalledWith('削除しますか？')
    expect(action).not.toHaveBeenCalled()
    expect(refresh).not.toHaveBeenCalled()
  })

  it('should refresh the page and show the success text on success', async () => {
    const action = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, {
        confirmMessage: '削除しますか？',
        successText: 'タレントを削除しました。',
      })
    })

    await waitFor(() => {
      expect(result.current.message).toEqual({
        text: 'タレントを削除しました。',
        type: 'success',
      })
    })
    expect(action).toHaveBeenCalledTimes(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(result.current.isPending).toBe(false)
  })

  it('should refresh the page without a message when successText is omitted', async () => {
    const action = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, { confirmMessage: '引退にしますか？' })
    })

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1)
    })
    expect(result.current.message).toBeNull()
  })

  it('should show the returned error without refreshing on failure', async () => {
    const action = vi.fn().mockResolvedValue({
      error: '指定されたタレントが見つかりません。',
      success: false,
    })
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, { confirmMessage: '復活しますか？' })
    })

    await waitFor(() => {
      expect(result.current.message).toEqual({
        text: '指定されたタレントが見つかりません。',
        type: 'error',
      })
    })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('should show a fallback error when the action fails without a message', async () => {
    const action = vi.fn().mockResolvedValue({ success: false })
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, { confirmMessage: '復活しますか？' })
    })

    await waitFor(() => {
      expect(result.current.message).toEqual({
        text: '操作に失敗しました。',
        type: 'error',
      })
    })
  })

  it('should show an unexpected error when the action throws', async () => {
    const action = vi.fn().mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useTalentLifecycleAction())

    act(() => {
      result.current.run(action, { confirmMessage: '削除しますか？' })
    })

    await waitFor(() => {
      expect(result.current.message).toEqual({
        text: '予期しないエラーが発生しました。',
        type: 'error',
      })
    })
    expect(refresh).not.toHaveBeenCalled()
  })
})
