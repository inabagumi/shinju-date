import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'
import { Card, CardContent, CardFooter, CardHeader } from './card'

const meta = {
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined'],
    },
  },
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Card',
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-lg">Card Title</h3>
        </CardHeader>
        <CardContent>
          <p>This is the card content area. You can place any content here.</p>
        </CardContent>
      </>
    ),
    variant: 'default',
  },
}

export const Elevated: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-lg">Elevated Card</h3>
        </CardHeader>
        <CardContent>
          <p>
            This card has an elevated appearance with a white background and
            shadow.
          </p>
        </CardContent>
      </>
    ),
    variant: 'elevated',
  },
}

export const Outlined: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-lg">Outlined Card</h3>
        </CardHeader>
        <CardContent>
          <p>This card has a transparent background with a visible border.</p>
        </CardContent>
      </>
    ),
    variant: 'outlined',
  },
}

export const WithFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <h3 className="font-semibold text-lg">Card with Footer</h3>
        </CardHeader>
        <CardContent>
          <p>This card includes a footer section with action buttons.</p>
        </CardContent>
        <CardFooter>
          <div className="flex gap-2">
            <Button size="sm" variant="primary">
              Confirm
            </Button>
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
          </div>
        </CardFooter>
      </>
    ),
    variant: 'elevated',
  },
}

export const VideoCard: Story = {
  args: {
    children: (
      <>
        <div className="aspect-video w-full bg-gray-300 dark:bg-zinc-700" />
        <CardHeader>
          <h3 className="line-clamp-2 font-semibold text-sm">
            Sample Video Title
          </h3>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-xs dark:text-zinc-400">
            Talent Name
          </p>
          <p className="text-gray-500 text-xs dark:text-zinc-500">
            1.2M views • 2 days ago
          </p>
        </CardContent>
      </>
    ),
    style: { width: '320px' },
    variant: 'default',
  },
}
