import preview from '#.storybook/preview'
import { Textarea } from './textarea'

const meta = preview.meta({
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    variant: {
      control: 'select',
      options: ['default', 'error'],
    },
  },
  component: Textarea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Textarea',
})

export const Default = meta.story({
  args: {
    placeholder: 'Enter text...',
    rows: 4,
    variant: 'default',
  },
})

export const WithValue = meta.story({
  args: {
    rows: 4,
    value:
      'This is a sample text content in a textarea. You can edit this text.',
    variant: 'default',
  },
})

export const ErrorState = meta.story({
  args: {
    placeholder: 'Enter text...',
    rows: 4,
    value: 'This content has an error',
    variant: 'error',
  },
})

export const Disabled = meta.story({
  args: {
    disabled: true,
    placeholder: 'Disabled textarea',
    rows: 4,
  },
})

export const Large = meta.story({
  args: {
    placeholder: 'Large textarea with many rows',
    rows: 8,
  },
})

export const Small = meta.story({
  args: {
    placeholder: 'Small textarea',
    rows: 2,
  },
})

export const WithLabel = meta.story({
  args: {
    placeholder: 'Enter your feedback',
    rows: 5,
  },
  render: (args) => (
    <div className="flex w-96 flex-col gap-2">
      <label className="font-medium text-sm" htmlFor="textarea-with-label">
        Feedback
      </label>
      <Textarea {...args} id="textarea-with-label" />
    </div>
  ),
})

export const WithErrorMessage = meta.story({
  args: {
    rows: 4,
    value: 'Too short',
    variant: 'error',
  },
  render: (args) => (
    <div className="flex w-96 flex-col gap-2">
      <label className="font-medium text-sm" htmlFor="textarea-error">
        Description
      </label>
      <Textarea {...args} id="textarea-error" />
      <p className="text-red-600 text-sm dark:text-red-500">
        Description must be at least 20 characters long
      </p>
    </div>
  ),
})

export const WithCounter = meta.story({
  args: {
    maxLength: 200,
    placeholder: 'Enter up to 200 characters',
    rows: 5,
  },
  render: (args) => {
    const value = args.value as string | undefined
    const count = value?.length || 0
    const maxLength = args.maxLength || 0

    return (
      <div className="flex w-96 flex-col gap-2">
        <label className="font-medium text-sm" htmlFor="textarea-counter">
          Comment
        </label>
        <Textarea {...args} id="textarea-counter" />
        <p className="text-right text-gray-600 text-sm dark:text-gray-400">
          {count}/{maxLength}
        </p>
      </div>
    )
  },
})
