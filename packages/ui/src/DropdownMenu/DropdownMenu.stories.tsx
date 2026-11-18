import { EllipsisVertical, ExternalLink } from 'lucide-react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import preview from '#.storybook/preview'
import { Button } from '../Button/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './DropdownMenu'

/** 項目を選んだときに呼ばれる。ストーリーのテストで、選んだ項目を確かめる */
const onSelect = fn<(value: string) => void>()

const meta = preview.meta({
  component: DropdownMenu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  title: 'Components/DropdownMenu',
})

export const RowActions = meta.story({
  play: async ({ canvasElement }) => {
    onSelect.mockClear()

    const canvas = within(canvasElement)
    const body = within(document.body)

    const trigger = canvas.getByRole('button', { name: 'アクションメニュー' })

    // キーボードで開き、矢印キーで移動して Enter で実行する
    trigger.focus()
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(body.getByRole('menu')).toBeVisible())
    await expect(
      body.getByRole('menuitem', { name: 'YouTubeで見る' }),
    ).toHaveFocus()

    await userEvent.keyboard('{ArrowDown}')
    await expect(
      body.getByRole('menuitem', { name: '表示/非表示を切り替え' }),
    ).toHaveFocus()

    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(body.queryByRole('menu')).toBeNull())
    await expect(onSelect).toHaveBeenCalledWith('toggle')
    await expect(trigger).toHaveFocus()

    // Escape で閉じると、開いたボタンにフォーカスが戻る
    await userEvent.click(trigger)
    await waitFor(() => expect(body.getByRole('menu')).toBeVisible())
    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(body.queryByRole('menu')).toBeNull())
    await expect(trigger).toHaveFocus()
  },
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="アクションメニュー">
        <EllipsisVertical aria-hidden="true" className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a
            href="https://www.youtube.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            YouTubeで見る
            <ExternalLink aria-hidden="true" className="size-4 text-muted" />
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect('toggle')}>
          表示/非表示を切り替え
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onSelect('delete')} variant="danger">
          削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
})

export const WithButtonTrigger = meta.story({
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">データ管理</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuItem onSelect={() => onSelect('videos')}>
          動画管理
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect('talents')}>
          タレント管理
        </DropdownMenuItem>
        <DropdownMenuItem disabled>用語管理（準備中）</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
})
