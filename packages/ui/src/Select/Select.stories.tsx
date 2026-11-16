import { expect, userEvent, within } from 'storybook/test'
import preview from '#.storybook/preview'
import { Input } from '../Input/Input'
import { Select } from './Select'

const meta = preview.meta({
  args: {
    'aria-label': '並び順',
    children: (
      <>
        <option value="published_at">公開日時が新しい順</option>
        <option value="title">タイトル順</option>
        <option value="duration">再生時間が長い順</option>
      </>
    ),
  },
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
      options: ['default', 'danger'],
    },
  },
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/Select',
})

export const Default = meta.story({
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const select = canvas.getByRole('combobox', { name: '並び順' })

    await userEvent.selectOptions(select, 'title')
    await expect(select).toHaveValue('title')
  },
})

export const ErrorState = meta.story({
  args: {
    variant: 'danger',
  },
})

export const Disabled = meta.story({
  args: {
    disabled: true,
  },
})

export const Sizes = meta.story({
  render: (args) => (
    <div className="flex w-72 flex-col gap-4">
      <Select {...args} inputSize="sm" />
      <Select {...args} inputSize="md" />
      <Select {...args} inputSize="lg" />
    </div>
  ),
})

/** `Input` と並べても高さ・枠・角丸がそろう */
export const NextToInput = meta.story({
  render: (args) => (
    <div className="flex w-[32rem] gap-2">
      <Input aria-label="キーワード" placeholder="キーワード" />
      <Select {...args} />
    </div>
  ),
})
