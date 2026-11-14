import { expect, userEvent, within } from 'storybook/test'
import preview from '#.storybook/preview'
import { Button } from '../Button/Button'
import { Input } from '../Input/Input'
import { Select } from '../Select/Select'
import { FilterBar } from './FilterBar'

const meta = preview.meta({
  component: FilterBar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  title: 'Components/FilterBar',
})

const filters = (
  <>
    <Input
      aria-label="キーワード"
      className="md:w-64"
      placeholder="キーワード"
    />
    <Select aria-label="公開状態" className="md:w-48" defaultValue="visible">
      <option value="">すべての公開状態</option>
      <option value="visible">公開中</option>
      <option value="hidden">非表示</option>
    </Select>
    <Select aria-label="種類" className="md:w-48" defaultValue="">
      <option value="">すべての種類</option>
      <option value="standard">動画</option>
      <option value="short">ショート</option>
    </Select>
    <Button variant="ghost">解除</Button>
  </>
)

export const Default = meta.story({
  args: {
    activeCount: 1,
    children: filters,
  },
})

/** 狭い画面ではボタンの中に折りたたみ、適用中の件数を表示する */
export const Narrow = meta.story({
  args: {
    activeCount: 2,
    children: filters,
  },
  globals: {
    viewport: { value: 'mobile1' },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole('button', { name: /絞り込み/ })

    const keyword = canvas.getByRole('textbox', {
      hidden: true,
      name: 'キーワード',
    })

    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(keyword).not.toBeVisible()

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(keyword).toBeVisible()

    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await expect(keyword).not.toBeVisible()
  },
})
