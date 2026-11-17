import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../dropdown-menu'

function renderMenu() {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger aria-label="アクションメニュー">
        ︙
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <a
            href="https://example.com/"
            rel="noopener noreferrer"
            target="_blank"
          >
            外部で見る
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem>復元</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  )
}

describe('DropdownMenuItem', () => {
  it('renders an item as a button by default', () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: 'アクションメニュー' }))

    const item = screen.getByRole('menuitem', { name: '復元' })

    expect(item.tagName).toBe('BUTTON')
    expect(item).toHaveAttribute('type', 'button')
  })

  it('renders the child link as an item and closes the menu when it is opened', () => {
    renderMenu()

    fireEvent.click(screen.getByRole('button', { name: 'アクションメニュー' }))

    const item = screen.getByRole('menuitem', { name: '外部で見る' })

    expect(item.tagName).toBe('A')
    expect(item).toHaveAttribute('href', 'https://example.com/')
    expect(item).not.toHaveAttribute('type')
    expect(item).toHaveClass('rounded-control', 'text-meta')

    item.addEventListener('click', (event) => event.preventDefault())
    fireEvent.click(item)

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
