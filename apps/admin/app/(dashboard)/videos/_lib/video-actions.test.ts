import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  restoreAction,
  softDeleteAction,
  toggleVisibilityAction,
} from '../_actions'
import { getVideoActionSuccessText, runVideoAction } from './video-actions'

vi.mock('../_actions', () => ({
  restoreAction: vi.fn(),
  softDeleteAction: vi.fn(),
  toggleVisibilityAction: vi.fn(),
}))

const targetA = { id: 'video-a', title: 'Video A' }
const targetB = { id: 'video-b', title: 'Video B' }

describe('runVideoAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['toggle', toggleVisibilityAction],
    ['delete', softDeleteAction],
    ['restore', restoreAction],
  ] as const)(
    'calls the action of %s with the target IDs',
    async (action, fn) => {
      vi.mocked(fn).mockResolvedValue({ success: true })

      const result = await runVideoAction(action, [targetA, targetB])

      expect(fn).toHaveBeenCalledWith(['video-a', 'video-b'])
      expect(result).toEqual({
        action,
        error: undefined,
        success: true,
        targets: [targetA, targetB],
      })
    },
  )

  it.each([
    ['toggle', toggleVisibilityAction, '更新に失敗しました。'],
    ['delete', softDeleteAction, '削除に失敗しました。'],
    ['restore', restoreAction, '復元に失敗しました。'],
  ] as const)(
    'fills the error of %s when the action returns none',
    async (action, fn, text) => {
      vi.mocked(fn).mockResolvedValue({ success: false })

      const result = await runVideoAction(action, [targetA])

      expect(result.error).toBe(text)
    },
  )

  it('keeps the error returned by the action', async () => {
    vi.mocked(softDeleteAction).mockResolvedValue({
      error: '動画が見つかりませんでした。',
      success: false,
    })

    const result = await runVideoAction('delete', [targetA])

    expect(result.error).toBe('動画が見つかりませんでした。')
  })
})

describe('getVideoActionSuccessText', () => {
  it('tells the number of toggled videos', () => {
    expect(
      getVideoActionSuccessText({
        action: 'toggle',
        success: true,
        targets: [targetA, targetB],
        updatedCount: 2,
      }),
    ).toBe('2 件の動画の表示状態を更新しました。')
  })

  it('tells the new state when the visibility of a single video is known', () => {
    expect(
      getVideoActionSuccessText({
        action: 'toggle',
        success: true,
        targets: [{ ...targetA, visible: false }],
        updatedCount: 1,
      }),
    ).toBe('動画を表示に変更しました。')
  })

  it.each([
    ['delete', '動画を削除しました。'],
    ['restore', '動画を復元しました。'],
  ] as const)('returns the text of %s', (action, text) => {
    expect(
      getVideoActionSuccessText({ action, success: true, targets: [targetA] }),
    ).toBe(text)
  })
})
