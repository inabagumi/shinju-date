import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ActionToastProvider } from '@/components/action-toast'

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
    { wrapper: ActionToastProvider },
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
    expect(screen.getByText('クエリを削除しました。')).toBeInTheDocument()
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
    expect(screen.queryByText('クエリを削除しました。')).not.toBeInTheDocument()
  })

  it('adds a query, clears the input and shows a toast', async () => {
    mocks.addQueryAction.mockResolvedValue({ success: true })
    renderList()

    const input = screen.getByLabelText('新しい手動クエリを追加')
    fireEvent.change(input, { target: { value: '雑談' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    expect(
      await screen.findByText('クエリを追加しました。'),
    ).toBeInTheDocument()
    expect(mocks.addQueryAction).toHaveBeenCalledWith('雑談')
    expect(input).toHaveValue('')
  })

  it('keeps the input and shows the error in a toast when adding fails', async () => {
    mocks.addQueryAction.mockResolvedValue({
      error: 'クエリを入力してください。',
      success: false,
    })
    renderList()

    const input = screen.getByLabelText('新しい手動クエリを追加')
    fireEvent.change(input, { target: { value: '雑談' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    expect(
      await screen.findByText('クエリを入力してください。'),
    ).toBeInTheDocument()
    expect(input).toHaveValue('雑談')
  })
})
