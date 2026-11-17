import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findSuspenseChildren, runServerComponent } from '@/test/suspense'

const mocks = vi.hoisted(() => ({
  getFeatureRequestById: vi.fn(),
}))

vi.mock('../../_lib/get-feedback', () => ({
  getFeatureRequestById: mocks.getFeatureRequestById,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

const { default: FeedbackDetailPage, generateMetadata } = await import(
  '../page'
)

const FEEDBACK_ID = '123e4567-e89b-12d3-a456-426614174000'

const featureRequest = {
  admin_memo: null,
  created_at: '2026-11-01T00:00:00Z',
  id: FEEDBACK_ID,
  is_read: false,
  message: '検索の絞り込みがほしい',
  status: 'pending',
  updated_at: '2026-11-01T00:00:00Z',
}

describe('FeedbackDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getFeatureRequestById.mockResolvedValue(featureRequest)
  })

  it('fetches the title and the body with the same cached call', async () => {
    const params = Promise.resolve({ id: FEEDBACK_ID })

    await expect(generateMetadata({ params })).resolves.toEqual({
      title: '検索の絞り込みがほしい - 機能要望詳細',
    })

    const detail = await findSuspenseChildren(FeedbackDetailPage({ params }))
    await runServerComponent(detail)

    // `getFeatureRequestById` is a `'use cache: private'` function, so the
    // calls with the same arguments share one entry and query the database
    // once per request.
    expect(mocks.getFeatureRequestById.mock.calls).toEqual([
      [FEEDBACK_ID],
      [FEEDBACK_ID],
    ])
  })

  it('names the page as not found when the request does not exist', async () => {
    mocks.getFeatureRequestById.mockResolvedValue(null)

    await expect(
      generateMetadata({ params: Promise.resolve({ id: FEEDBACK_ID }) }),
    ).resolves.toEqual({ title: '機能要望が見つかりません' })
  })
})
