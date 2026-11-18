import type { Tables } from '@shinju-date/database'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FeatureRequestList } from './feedback-list'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/feedback',
  useRouter: () => ({ push: vi.fn(), replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}))

function createFeatureRequest(
  overrides: Partial<Tables<'feature_requests'>> = {},
): Tables<'feature_requests'> {
  return {
    admin_memo: null,
    created_at: '2025-01-01T00:00:00Z',
    id: '00000000-0000-4000-8000-000000000001',
    is_read: false,
    message: '配信予定をカレンダーに登録したい',
    status: 'pending',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('FeatureRequestList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
  })

  it('renders a row for each feature request with the status and a link', () => {
    render(
      <FeatureRequestList
        featureRequests={[
          createFeatureRequest(),
          createFeatureRequest({
            id: '00000000-0000-4000-8000-000000000002',
            is_read: true,
            message: '特定のタレントの動画だけを表示したい',
            status: 'resolved',
          }),
        ]}
        readFilter={undefined}
        statusFilter={undefined}
      />,
    )

    const [unread, read] = screen.getAllByRole('row').slice(1) as [
      HTMLElement,
      HTMLElement,
    ]

    expect(unread).toHaveTextContent('未対応')
    expect(unread).toHaveTextContent('未読')
    expect(
      within(unread).getByRole('link', {
        name: '配信予定をカレンダーに登録したい',
      }),
    ).toHaveAttribute('href', '/feedback/00000000-0000-4000-8000-000000000001')

    expect(read).toHaveTextContent('対応済み')
    expect(read).not.toHaveTextContent('未読')
  })

  it('shows the current filters', () => {
    render(
      <FeatureRequestList
        featureRequests={[]}
        readFilter="unread"
        statusFilter="in_progress"
      />,
    )

    expect(screen.getByLabelText('ステータス')).toHaveValue('in_progress')
    expect(screen.getByLabelText('既読状態')).toHaveValue('unread')
    expect(screen.getByText('機能要望がありません')).toBeInTheDocument()
  })

  it('writes the selected filters to the URL and removes them for all', () => {
    mocks.searchParams = new URLSearchParams('read=unread')
    render(
      <FeatureRequestList
        featureRequests={[]}
        readFilter="unread"
        statusFilter={undefined}
      />,
    )

    fireEvent.change(screen.getByLabelText('ステータス'), {
      target: { value: 'rejected' },
    })
    expect(mocks.replace).toHaveBeenLastCalledWith(
      '/feedback?read=unread&status=rejected',
    )

    fireEvent.change(screen.getByLabelText('既読状態'), {
      target: { value: 'all' },
    })
    expect(mocks.replace).toHaveBeenLastCalledWith('/feedback')
  })
})
