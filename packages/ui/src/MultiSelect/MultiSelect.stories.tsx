import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import preview from '#.storybook/preview'
import { MultiSelect } from './MultiSelect'

const meta = preview.meta({
  component: MultiSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/MultiSelect',
})

const MultiSelectWithState = (args: Parameters<typeof MultiSelect>[0]) => {
  const [value, setValue] = useState<string[]>(args.value || [])

  return <MultiSelect {...args} onChange={setValue} value={value} />
}

export const Default = meta.story({
  args: {
    options: [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
      { label: 'Option 3', value: '3' },
      { label: 'Option 4', value: '4' },
      { label: 'Option 5', value: '5' },
    ],
    placeholder: 'Select options',
    value: [],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Find and click the trigger button
    const trigger = canvas.getByRole('button', { name: /select options/i })
    await expect(trigger).toBeInTheDocument()
    await userEvent.click(trigger)

    // Wait for popover to appear
    await waitFor(() => {
      const option = within(document.body).getByLabelText(/option 1/i)
      expect(option).toBeInTheDocument()
    })

    // Get option elements after popover is visible
    const bodyContext = within(document.body)
    const option1 = bodyContext.getByLabelText(/option 1/i)
    const option2 = bodyContext.getByLabelText(/option 2/i)

    // Select Option 1
    await userEvent.click(option1)
    await expect(option1).toBeChecked()

    // Select Option 2
    await userEvent.click(option2)
    await expect(option2).toBeChecked()

    // Verify display shows "2件選択中"
    await waitFor(() => {
      const displayText = canvas.getByText(/2件選択中/i)
      expect(displayText).toBeInTheDocument()
    })

    // Deselect Option 1
    await userEvent.click(option1)
    await expect(option1).not.toBeChecked()
  },
  render: (args) => <MultiSelectWithState {...args} />,
})

export const WithPreselected = meta.story({
  args: {
    options: [
      { label: 'Tokyo', value: 'tokyo' },
      { label: 'Osaka', value: 'osaka' },
      { label: 'Kyoto', value: 'kyoto' },
      { label: 'Nagoya', value: 'nagoya' },
      { label: 'Sapporo', value: 'sapporo' },
    ],
    placeholder: 'Select cities',
    value: ['tokyo', 'osaka'],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Verify display shows "2件選択中"
    const displayText = canvas.getByText(/2件選択中/i)
    await expect(displayText).toBeInTheDocument()

    // Open the popover
    const trigger = canvas.getByRole('button')
    await userEvent.click(trigger)

    // Wait for popover to appear
    await waitFor(() => {
      const tokyoOption = within(document.body).getByLabelText(/tokyo/i)
      expect(tokyoOption).toBeInTheDocument()
    })

    // Verify preselected items are checked
    const tokyoOption = within(document.body).getByLabelText(/tokyo/i)
    const osakaOption = within(document.body).getByLabelText(/osaka/i)
    await expect(tokyoOption).toBeChecked()
    await expect(osakaOption).toBeChecked()

    // Test "Select All" functionality
    const selectAllButton = within(document.body).getByRole('button', {
      name: /すべて選択/i,
    })
    await userEvent.click(selectAllButton)

    // Verify all options are checked
    await expect(tokyoOption).toBeChecked()
    await expect(osakaOption).toBeChecked()
    const kyotoOption = within(document.body).getByLabelText(/kyoto/i)
    await expect(kyotoOption).toBeChecked()

    // Test "Deselect All" functionality (button text should change)
    const deselectAllButton = within(document.body).getByRole('button', {
      name: /すべて解除/i,
    })
    await userEvent.click(deselectAllButton)

    // Verify all options are unchecked
    await expect(tokyoOption).not.toBeChecked()
    await expect(osakaOption).not.toBeChecked()
    await expect(kyotoOption).not.toBeChecked()
  },
  render: (args) => <MultiSelectWithState {...args} />,
})

export const ManyOptions = meta.story({
  args: {
    options: Array.from({ length: 20 }, (_, i) => ({
      label: `Option ${i + 1}`,
      value: `${i + 1}`,
    })),
    placeholder: 'Select from many options',
    value: [],
  },
  render: (args) => <MultiSelectWithState {...args} />,
})

export const CustomMaxHeight = meta.story({
  args: {
    maxHeight: '150px',
    options: Array.from({ length: 15 }, (_, i) => ({
      label: `Item ${i + 1}`,
      value: `${i + 1}`,
    })),
    placeholder: 'Scroll to see more',
    value: [],
  },
  render: (args) => <MultiSelectWithState {...args} />,
})
