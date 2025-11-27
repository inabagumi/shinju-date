import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { MultiSelect } from './multi-select'

const meta = {
  component: MultiSelect,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/MultiSelect',
} satisfies Meta<typeof MultiSelect>

export default meta

type Story = StoryObj<typeof meta>

const MultiSelectWithState = (args: Parameters<typeof MultiSelect>[0]) => {
  const [value, setValue] = useState<string[]>(args.value || [])

  return <MultiSelect {...args} onChange={setValue} value={value} />
}

export const Default: Story = {
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
  render: (args) => <MultiSelectWithState {...args} />,
}

export const WithPreselected: Story = {
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
  render: (args) => <MultiSelectWithState {...args} />,
}

export const ManyOptions: Story = {
  args: {
    options: Array.from({ length: 20 }, (_, i) => ({
      label: `Option ${i + 1}`,
      value: `${i + 1}`,
    })),
    placeholder: 'Select from many options',
    value: [],
  },
  render: (args) => <MultiSelectWithState {...args} />,
}

export const CustomMaxHeight: Story = {
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
}
