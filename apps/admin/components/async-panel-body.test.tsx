import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AsyncPanelBody } from './async-panel-body'

describe('AsyncPanelBody', () => {
  it('renders only the content while nothing failed', () => {
    render(
      <AsyncPanelBody error={null} onRetry={vi.fn()}>
        <p>進捗</p>
      </AsyncPanelBody>,
    )

    expect(screen.getByText('進捗')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('tells why the reload failed above the content it still has', () => {
    render(
      <AsyncPanelBody error="Redis に接続できません" onRetry={vi.fn()}>
        <p>進捗</p>
      </AsyncPanelBody>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Redis に接続できません',
    )
    expect(screen.getByText('進捗')).toBeInTheDocument()
  })

  it('retries, keeping the button busy until the reload ends', async () => {
    let finish: () => void = () => {}
    const onRetry = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )

    render(
      <AsyncPanelBody error="timeout" onRetry={onRetry}>
        <p>進捗</p>
      </AsyncPanelBody>,
    )

    const button = screen.getByRole('button', { name: '再試行' })

    fireEvent.click(button)

    expect(onRetry).toHaveBeenCalledOnce()
    await waitFor(() => expect(button).toBeDisabled())

    finish()

    await waitFor(() => expect(button).toBeEnabled())
  })
})
