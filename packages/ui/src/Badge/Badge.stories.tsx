import preview from '#.storybook/preview'
import { Badge } from './Badge'

const meta = preview.meta({
  argTypes: {
    variant: {
      control: 'select',
      options: ['success', 'warning', 'danger', 'neutral', 'info'],
    },
  },
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Badge',
})

export const Info = meta.story({
  args: {
    children: 'Info Badge',
    variant: 'info',
  },
})

export const Success = meta.story({
  args: {
    children: 'Success Badge',
    variant: 'success',
  },
})

export const Warning = meta.story({
  args: {
    children: 'Warning Badge',
    variant: 'warning',
  },
})

export const Danger = meta.story({
  args: {
    children: 'Danger Badge',
    variant: 'danger',
  },
})

export const Neutral = meta.story({
  args: {
    children: 'Neutral Badge',
    variant: 'neutral',
  },
})

export const Default = meta.story({
  args: {
    children: 'Default Badge',
  },
})

export const LongText = meta.story({
  args: {
    children: 'This is a longer badge text',
    variant: 'info',
  },
})

export const WithCustomClass = meta.story({
  args: {
    children: 'Custom Badge',
    className: 'text-base px-4 py-2',
    variant: 'success',
  },
})
