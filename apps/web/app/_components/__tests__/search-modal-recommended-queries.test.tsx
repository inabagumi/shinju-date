import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { SearchModalRecommendedQueries } from '../search-modal-recommended-queries'

describe('SearchModalRecommendedQueries', () => {
  test('should render the heading and a skeleton while loading', () => {
    render(<SearchModalRecommendedQueries queries={null} />)

    expect(
      screen.getByRole('heading', { name: 'おすすめの検索キーワード' }),
    ).toBeInTheDocument()
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })

  test('should render nothing, including the heading, when there are no queries', () => {
    const { container } = render(<SearchModalRecommendedQueries queries={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  test('should render the heading and the queries when loaded', () => {
    const onClickLink = vi.fn()

    render(
      <SearchModalRecommendedQueries
        onClickLink={onClickLink}
        queries={['歌枠', 'ゲーム']}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'おすすめの検索キーワード' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('読み込み中...')).not.toBeInTheDocument()

    const link = screen.getByRole('link', { name: '歌枠' })
    expect(link).toHaveAttribute(
      'href',
      `/videos/${encodeURIComponent('歌枠')}`,
    )
    expect(screen.getByRole('link', { name: 'ゲーム' })).toBeInTheDocument()

    fireEvent.click(link)
    expect(onClickLink).toHaveBeenCalledTimes(1)
  })
})
