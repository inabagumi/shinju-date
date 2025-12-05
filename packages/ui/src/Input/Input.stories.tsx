import preview from '#.storybook/preview'
import { Input } from './Input'

const meta = preview.meta({
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
})

export const Default = meta.story({
  args: {
    placeholder: 'Enter text...',
    variant: 'default',
  },
})

export const WithValue = meta.story({
  args: {
    value: 'Hello World',
    variant: 'default',
  },
})

export const ErrorState = meta.story({
  args: {
    placeholder: 'Enter text...',
    value: 'Invalid input',
    variant: 'error',
  },
})

export const Disabled = meta.story({
  args: {
    disabled: true,
    placeholder: 'Disabled input',
  },
})

export const Small = meta.story({
  args: {
    inputSize: 'sm',
    placeholder: 'Small input',
  },
})

export const Medium = meta.story({
  args: {
    inputSize: 'md',
    placeholder: 'Medium input',
  },
})

export const Large = meta.story({
  args: {
    inputSize: 'lg',
    placeholder: 'Large input',
  },
})

export const Email = meta.story({
  args: {
    placeholder: 'email@example.com',
    type: 'email',
  },
})

export const Password = meta.story({
  args: {
    placeholder: 'Enter password',
    type: 'password',
  },
})

export const Search = meta.story({
  args: {
    placeholder: 'Search...',
    type: 'search',
  },
})

export const WithLabel = meta.story({
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
})

export const WithErrorMessage = meta.story({
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
})
