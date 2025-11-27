import type { Meta, StoryObj } from '@storybook/react-vite'
import { Badge } from './badge'

const meta = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error', 'secondary'],
    },
  },
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Badge',
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  args: {
    children: 'Info Badge',
    variant: 'info',
  },
}

export const Success: Story = {
  args: {
    children: 'Success Badge',
    variant: 'success',
  },
}

export const Warning: Story = {
  args: {
    children: 'Warning Badge',
    variant: 'warning',
  },
}

export const ErrorVariant: Story = {
  args: {
    children: 'Error Badge',
    variant: 'error',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Badge',
    variant: 'secondary',
  },
}

export const Default: Story = {
  args: {
    children: 'Default Badge',
  },
}

export const LongText: Story = {
  args: {
    children: 'This is a longer badge text',
    variant: 'info',
  },
}

export const WithCustomClass: Story = {
  args: {
    children: 'Custom Badge',
    className: 'text-base px-4 py-2',
    variant: 'success',
  },
}
