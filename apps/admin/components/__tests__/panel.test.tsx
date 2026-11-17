import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  DetailList,
  DetailListSkeleton,
  DetailRow,
  Panel,
  PanelSkeleton,
} from '../panel'

describe('Panel', () => {
  it('renders the title as a heading with the description and actions', () => {
    render(
      <Panel
        actions={<button type="button">編集</button>}
        description="現在データベースに保存されている情報"
        title="タレント情報"
      >
        <p>中身</p>
      </Panel>,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'タレント情報' }),
    ).toHaveClass('text-heading', 'font-bold')
    expect(
      screen.getByText('現在データベースに保存されている情報'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '編集' })).toBeInTheDocument()
    expect(screen.getByText('中身')).toBeInTheDocument()
  })

  it('draws the frame of a panel and passes other props to it', () => {
    render(
      <Panel className="lg:col-span-2" id="panel" role="region" title="枠">
        中身
      </Panel>,
    )

    expect(screen.getByRole('region')).toHaveAttribute('id', 'panel')
    expect(screen.getByRole('region')).toHaveClass(
      'rounded-container',
      'border',
      'border-border',
      'bg-surface',
      'p-6',
      'lg:col-span-2',
    )
    expect(screen.getByRole('region')).not.toHaveClass('bg-muted')
  })

  it('renders no heading without a title, description or actions', () => {
    render(<Panel>中身</Panel>)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('leaves no space under the heading when there is nothing below it', () => {
    render(<Panel actions={false} title="状態の変更" />)

    const heading = screen.getByRole('heading', { name: '状態の変更' })

    expect(heading.closest('.mb-4')).toBeNull()
  })
})

describe('DetailList', () => {
  it('pairs each label with its value', () => {
    render(
      <DetailList>
        <DetailRow label="タレント名">あいうえお</DetailRow>
      </DetailList>,
    )

    expect(screen.getByRole('term')).toHaveTextContent('タレント名')
    expect(screen.getByRole('definition')).toHaveTextContent('あいうえお')
  })
})

describe('PanelSkeleton', () => {
  it('draws the same heading as Panel and hides itself from assistive technology', () => {
    const { container } = render(
      <PanelSkeleton description="補足" title="タレント情報">
        <span data-testid="content" />
      </PanelSkeleton>,
    )
    const panel = container.firstElementChild

    expect(panel).toHaveAttribute('aria-hidden', 'true')
    expect(panel).toHaveClass(
      'rounded-container',
      'border',
      'bg-surface',
      'p-6',
    )
    expect(
      screen.getByRole('heading', {
        hidden: true,
        level: 2,
        name: 'タレント情報',
      }),
    ).toHaveClass('text-heading', 'font-bold')
    expect(screen.getByText('補足')).toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()
  })
})

describe('DetailListSkeleton', () => {
  it('draws as many rows as given', () => {
    const { container } = render(<DetailListSkeleton rows={4} />)

    expect(container.firstElementChild?.children).toHaveLength(4)
  })
})
