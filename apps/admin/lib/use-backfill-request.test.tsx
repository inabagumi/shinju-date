import { act, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'
import { useBackfillRequest } from './use-backfill-request'

describe('useBackfillRequest', () => {
  it('tells what was queued, then reloads the progress', async () => {
    const calls: string[] = []
    const action = vi.fn(async (talentId: string) => {
      calls.push(`action:${talentId}`)

      return {
        data: { message: '2件キューに追加しました。' },
        success: true,
      }
    })
    const reload = vi.fn(async () => {
      calls.push('reload')
    })

    const { result } = renderHook(() => useBackfillRequest(action, reload), {
      wrapper: ActionToastProvider,
    })

    await act(() => result.current('talent-1'))

    expect(calls).toEqual(['action:talent-1', 'reload'])
    expect(screen.getByText('2件キューに追加しました。')).toBeInTheDocument()
  })

  it('reloads the progress even when nothing could be queued', async () => {
    const action = vi.fn(async () => ({
      error: '既に実行中です。',
      success: false,
    }))
    const reload = vi.fn(async () => {})

    const { result } = renderHook(() => useBackfillRequest(action, reload), {
      wrapper: ActionToastProvider,
    })

    await act(() => result.current())

    expect(screen.getByText('既に実行中です。')).toBeInTheDocument()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('falls back to general texts when the action gives none', async () => {
    const action = vi
      .fn<() => Promise<{ success: boolean }>>()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false })

    const { result } = renderHook(
      () => useBackfillRequest(action, async () => {}),
      { wrapper: ActionToastProvider },
    )

    await act(() => result.current())

    expect(screen.getByText('キューに追加しました。')).toBeInTheDocument()

    await act(() => result.current())

    expect(
      screen.getByText('キューへの追加に失敗しました。'),
    ).toBeInTheDocument()
  })
})
