import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './input'

const meta = {
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    inputSize: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
  },
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Input',
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    variant: 'default',
  },
}

export const WithValue: Story = {
  args: {
    value: 'Hello World',
    variant: 'default',
  },
}

export const ErrorState: Story = {
  args: {
    placeholder: 'Enter text...',
    value: 'Invalid input',
    variant: 'error',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
}

export const Small: Story = {
  args: {
    inputSize: 'sm',
    placeholder: 'Small input',
  },
}

export const Medium: Story = {
  args: {
    inputSize: 'md',
    placeholder: 'Medium input',
  },
}

export const Large: Story = {
  args: {
    inputSize: 'lg',
    placeholder: 'Large input',
  },
}

export const Email: Story = {
  args: {
    placeholder: 'email@example.com',
    type: 'email',
  },
}

export const Password: Story = {
  args: {
    placeholder: 'Enter password',
    type: 'password',
  },
}

export const Search: Story = {
  args: {
    placeholder: 'Search...',
    type: 'search',
  },
}

export const WithLabel: Story = {
  args: {
    placeholder: 'Enter your username',
  },
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <label className="font-medium text-sm" htmlFor="input-with-label">
        Username
      </label>
      <Input {...args} id="input-with-label" />
    </div>
  ),
}

export const WithErrorMessage: Story = {
  args: {
    type: 'email',
    value: 'invalid-email',
    variant: 'error',
  },
  render: (args) => (
    <div className="flex w-64 flex-col gap-2">
      <label className="font-medium text-sm" htmlFor="input-error">
        Email
      </label>
      <Input {...args} id="input-error" />
      <p className="text-red-600 text-sm dark:text-red-500">
        Please enter a valid email address
      </p>
    </div>
  ),
}
