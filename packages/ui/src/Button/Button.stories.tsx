import preview from '#.storybook/preview'
import { Button } from './Button'

const meta = preview.meta({
  argTypes: {
    disabled: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
    },
  },
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Button',
})

export const Primary = meta.story({
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
})

export const Secondary = meta.story({
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
})

export const Danger = meta.story({
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
})

export const Ghost = meta.story({
  args: {
    children: 'Ghost Button',
    variant: 'ghost',
  },
})

export const Small = meta.story({
  args: {
    children: 'Small Button',
    size: 'sm',
  },
})

export const Medium = meta.story({
  args: {
    children: 'Medium Button',
    size: 'md',
  },
})

export const Large = meta.story({
  args: {
    children: 'Large Button',
    size: 'lg',
  },
})

export const Disabled = meta.story({
  args: {
    children: 'Disabled Button',
    disabled: true,
  },
})

export const AsLink = meta.story({
  args: {
    asChild: true,
    children: 'Link styled as Button',
  },
  render: (args) => (
    <Button {...args}>
      <a href="https://shinju.date">Link styled as Button</a>
    </Button>
  ),
})
