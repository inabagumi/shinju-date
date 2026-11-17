import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  addQueryAction: vi.fn(),
  deleteQueryAction: vi.fn(),
}))

vi.mock('../_actions', () => ({
  addQueryAction: mocks.addQueryAction,
  deleteQueryAction: mocks.deleteQueryAction,
}))

const { QueriesList } = await import('./queries-list')

function renderList() {
  return render(
    <QueriesList autoQueries={[]} manualQueries={['ホロライブ', '歌枠']} />,
  )
}

describe('QueriesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('asks for confirmation before deleting a query', () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '「歌枠」を削除' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('おすすめクエリを削除')
    expect(dialog).toHaveTextContent('「歌枠」を削除しますか？')
    expect(mocks.deleteQueryAction).not.toHaveBeenCalled()
  })

  it('does not delete the query when cancelled', async () => {
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '「歌枠」を削除' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(mocks.deleteQueryAction).not.toHaveBeenCalled()
  })

  it('deletes the query after confirmation', async () => {
    mocks.deleteQueryAction.mockResolvedValue({ success: true })
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '「歌枠」を削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(mocks.deleteQueryAction).toHaveBeenCalledWith('歌枠')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('keeps the dialog open and shows the error when deleting fails', async () => {
    mocks.deleteQueryAction.mockResolvedValue({
      error: 'クエリの削除に失敗しました。',
      success: false,
    })
    renderList()

    fireEvent.click(screen.getByRole('button', { name: '「歌枠」を削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(
      await screen.findByText('クエリの削除に失敗しました。'),
    ).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
