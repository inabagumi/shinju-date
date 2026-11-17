import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BackfillAccountRow } from '../backfill-account-row'

describe('BackfillAccountRow', () => {
  it('shows the platform, the account and what is put beside them', () => {
    render(
      <ul>
        <BackfillAccountRow
          aside={<span>完了</span>}
          name="Main"
          provider="youtube"
        >
          <p>12件追加</p>
        </BackfillAccountRow>
      </ul>,
    )

    const row = screen.getByRole('listitem')

    expect(row).toHaveTextContent('YouTubeMain')
    expect(row).toHaveTextContent('12件追加')
    expect(row).toHaveTextContent('完了')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links to the talent before the account', () => {
    render(
      <ul>
        <BackfillAccountRow
          aside={null}
          name="alice"
          provider="twitch"
          talent={{ id: 'talent-1', name: 'Alice' }}
        />
      </ul>,
    )

    expect(screen.getByRole('link', { name: 'Alice' })).toHaveAttribute(
      'href',
      '/talents/talent-1',
    )
    expect(screen.getByRole('listitem')).toHaveTextContent('TwitchAlicealice')
  })

  it('tells when the talent or the account is not known', () => {
    render(
      <ul>
        <BackfillAccountRow
          aside={null}
          name={null}
          provider="youtube"
          talent={{ id: 'talent-1', name: null }}
        />
      </ul>,
    )

    expect(screen.getByText('不明なタレント')).toBeInTheDocument()
    expect(screen.getByText('削除されたアカウント')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows why the backfill failed', () => {
    render(
      <ul>
        <BackfillAccountRow
          aside={null}
          error="quota exceeded"
          name="Main"
          provider="youtube"
        />
      </ul>,
    )

    expect(screen.getByText('quota exceeded')).toHaveClass('text-danger')
  })
})
