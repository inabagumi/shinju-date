import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './dialog'

const meta = {
  component: Dialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Dialog',
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            This is a basic dialog with a title and description.
          </DialogDescription>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  ),
}

export const WithActions: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Delete Item</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Confirm Deletion</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this item? This action cannot be
            undone.
          </DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="danger">Delete</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  ),
}

export const WithForm: Story = {
  render: () => {
    const [name, setName] = useState('')
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button>Edit Profile</Button>
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                alert(`Saved: ${name}`)
              }}
            >
              <div className="mt-4 flex flex-col gap-2">
                <label className="font-medium text-sm" htmlFor="name">
                  Name
                </label>
                <input
                  className="rounded-md border border-gray-300 px-4 py-2 dark:border-zinc-700 dark:bg-zinc-800"
                  id="name"
                  onChange={(e) => setName(e.target.value)}
                  value={name}
                />
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    )
  },
}

export const LongContent: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Long Dialog</Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Please read the following terms and conditions carefully.
          </DialogDescription>
          <div className="mt-4 max-h-[40vh] overflow-y-auto">
            {Array.from({ length: 20 }, (_, i) => ({
              id: `term-${i}`,
              text: `${i + 1}. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`,
            })).map((term) => (
              <p
                className="mb-2 text-gray-700 text-sm dark:text-zinc-300"
                key={term.id}
              >
                {term.text}
              </p>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="secondary">Decline</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Accept</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  ),
}
