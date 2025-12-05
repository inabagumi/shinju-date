import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelect } from './MultiSelect'

describe('MultiSelect', () => {
  const defaultOptions = [
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ]

  it('should render with placeholder when no values selected', () => {
    render(
      <MultiSelect
        onChange={vi.fn()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Select items')
  })

  it('should display single selected item label', () => {
    render(
      <MultiSelect
        onChange={vi.fn()}
        options={defaultOptions}
        placeholder="Select items"
        value={['1']}
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('Option 1')
  })

  it('should display count when multiple items selected', () => {
    render(
      <MultiSelect
        onChange={vi.fn()}
        options={defaultOptions}
        placeholder="Select items"
        value={['1', '2']}
      />,
    )

    expect(screen.getByRole('button')).toHaveTextContent('2件選択中')
  })

  it('should open popover when button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <MultiSelect
        onChange={vi.fn()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />,
    )

    const button = screen.getByRole('button')
    await user.click(button)

    // Check if options are displayed
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('should call onChange when item is selected', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />,
    )

    const button = screen.getByRole('button')
    await user.click(button)

    // Click on Option 1
    const option1 = screen.getByText('Option 1')
    await user.click(option1)

    expect(handleChange).toHaveBeenCalledWith(['1'])
  })

  it('should toggle selection when clicking already selected item', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={['1']}
      />,
    )

    const button = screen.getByRole('button', { name: /option 1/i })
    await user.click(button)

    // Click on Option 1 checkbox (already selected)
    const option1Checkbox = screen.getByRole('checkbox', {
      name: /option 1/i,
    })
    await user.click(option1Checkbox)

    expect(handleChange).toHaveBeenCalledWith([])
  })

  it('should select all items when "すべて選択" is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />,
    )

    const button = screen.getByRole('button')
    await user.click(button)

    const selectAllButton = screen.getByText('すべて選択')
    await user.click(selectAllButton)

    expect(handleChange).toHaveBeenCalledWith(['1', '2', '3'])
  })

  it('should deselect all items when "すべて解除" is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    render(
      <MultiSelect
        onChange={handleChange}
        options={defaultOptions}
        placeholder="Select items"
        value={['1', '2', '3']}
      />,
    )

    const button = screen.getByRole('button')
    await user.click(button)

    const deselectAllButton = screen.getByText('すべて解除')
    await user.click(deselectAllButton)

    expect(handleChange).toHaveBeenCalledWith([])
  })

  it('should accept custom className', () => {
    render(
      <MultiSelect
        className="custom-class"
        onChange={vi.fn()}
        options={defaultOptions}
        placeholder="Select items"
        value={[]}
      />,
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })
})
