'use client'

import { twMerge } from '@shinju-date/ui'
import { ChevronDown, Menu, User, X } from 'lucide-react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import {
  type ComponentProps,
  type ReactNode,
  Suspense,
  useId,
  useState,
} from 'react'
import Form, { SubmitButton } from '@/components/form'
import { LogoIcon } from '@/components/logo-icon'
import { signOut } from '@/lib/actions/sign-out'

function ActiveNavigationLink({
  href,
  ...props
}: ComponentProps<typeof NextLink>) {
  const pathname = usePathname()
  const path = typeof href === 'string' ? href : href.pathname

  return (
    <NextLink
      {...props}
      aria-current={pathname === path ? 'page' : undefined}
      href={href}
    />
  )
}

function Link(props: ComponentProps<typeof NextLink>) {
  return (
    <Suspense fallback={<NextLink {...props} />}>
      <ActiveNavigationLink {...props} />
    </Suspense>
  )
}

interface NavigationItem {
  href: string
  label: string
}

const DATA_ITEMS: NavigationItem[] = [
  { href: '/videos', label: '動画管理' },
  { href: '/talents', label: 'タレント管理' },
  { href: '/terms', label: '用語管理' },
  { href: '/recommended-queries', label: 'おすすめクエリ管理' },
  { href: '/announcements', label: 'お知らせ管理' },
  { href: '/feedback', label: '機能要望管理' },
]

const ANALYTICS_ITEMS: NavigationItem[] = [
  { href: '/analytics/search', label: '検索アナリティクス' },
  { href: '/analytics/click', label: 'クリックアナリティクス' },
]

const USER_ITEMS: NavigationItem[] = [
  { href: '/account', label: 'アカウント設定' },
  { href: '/system', label: 'システム' },
]

type MenuId = 'analytics' | 'data' | 'user'

/** `bg-primary` のバーの上に置くボタンとリンク */
const barItemClassName =
  'inline-flex items-center gap-1 rounded-control px-3 py-1.5 text-meta font-semibold transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground'

/** ドロップダウンの中の項目。現在のページは `text-accent` で示す */
const menuItemClassName =
  'block w-full rounded-control px-3 py-2 text-left text-meta text-foreground transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none aria-[current=page]:font-semibold aria-[current=page]:text-accent'

interface DropdownProps {
  align?: 'left' | 'right'
  children: ReactNode
  /** ボタンの中身。アイコンだけの場合は `label` で名前を付ける */
  trigger: ReactNode
  label?: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

function Dropdown({
  align = 'left',
  children,
  isOpen,
  label,
  onOpenChange,
  trigger,
}: DropdownProps) {
  const menuId = useId()

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: マウスが離れたらメニューを閉じる
    <div className="relative" onMouseLeave={() => onOpenChange(false)}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-label={label}
        className={barItemClassName}
        onClick={() => onOpenChange(!isOpen)}
        onMouseEnter={() => onOpenChange(true)}
        type="button"
      >
        {trigger}
      </button>
      {isOpen && (
        // 開いたメニューとボタンの間でマウスが離れないよう、上に余白（pt-1）を取る
        <div
          className={twMerge(
            'absolute top-full z-50 min-w-52 pt-1',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <div
            className="rounded-container border border-border bg-surface p-1 shadow-overlay"
            id={menuId}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface NavigationBarProps {
  /** バーの右側に表示する最終同期の日時 */
  lastSync?: ReactNode
}

export function NavigationBar({ lastSync }: NavigationBarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null)

  const handleOpenChange = (id: MenuId) => (open: boolean) => {
    setOpenMenu(open ? id : (current) => (current === id ? null : current))
  }
  const closeMenu = () => setOpenMenu(null)

  return (
    <nav
      aria-label="メインメニュー"
      className="sticky top-0 z-50 bg-primary text-primary-foreground"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
        <NextLink
          className="flex shrink-0 items-center gap-2 rounded-control text-body font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
          href="/"
        >
          <LogoIcon className="size-7" />
          Admin UI
        </NextLink>

        {/* Desktop Navigation */}
        <div className="hidden grow items-center gap-1 md:flex">
          <Dropdown
            isOpen={openMenu === 'data'}
            onOpenChange={handleOpenChange('data')}
            trigger={
              <>
                データ管理
                <ChevronDown aria-hidden="true" className="size-4" />
              </>
            }
          >
            {DATA_ITEMS.map((item) => (
              <Link
                className={menuItemClassName}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </Dropdown>
          <Dropdown
            isOpen={openMenu === 'analytics'}
            onOpenChange={handleOpenChange('analytics')}
            trigger={
              <>
                アナリティクス
                <ChevronDown aria-hidden="true" className="size-4" />
              </>
            }
          >
            {ANALYTICS_ITEMS.map((item) => (
              <Link
                className={menuItemClassName}
                href={item.href}
                key={item.href}
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </Dropdown>
        </div>

        <div className="ml-auto flex items-center gap-4">
          {lastSync && (
            <p className="hidden text-caption text-primary-foreground/80 tabular-nums sm:block">
              {lastSync}
            </p>
          )}
          <div className="hidden md:block">
            <Dropdown
              align="right"
              isOpen={openMenu === 'user'}
              label="ユーザーメニュー"
              onOpenChange={handleOpenChange('user')}
              trigger={<User aria-hidden="true" className="size-5" />}
            >
              {USER_ITEMS.map((item) => (
                <Link
                  className={menuItemClassName}
                  href={item.href}
                  key={item.href}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 border-t border-border" />
              <Form action={signOut}>
                <SubmitButton
                  className={twMerge(menuItemClassName, 'font-normal')}
                  type="submit"
                  variant="ghost"
                >
                  ログアウト
                </SubmitButton>
              </Form>
            </Dropdown>
          </div>
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'メニューを閉じる' : 'メニューを開く'}
            className={twMerge(barItemClassName, 'p-2 md:hidden')}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            type="button"
          >
            {isMenuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="border-t border-primary-foreground/20 md:hidden">
          <div className="mx-auto max-w-7xl space-y-4 px-6 py-4">
            {lastSync && (
              <p className="text-caption text-primary-foreground/80 tabular-nums sm:hidden">
                {lastSync}
              </p>
            )}
            {[
              { items: DATA_ITEMS, title: 'データ管理' },
              { items: ANALYTICS_ITEMS, title: 'アナリティクス' },
              { items: USER_ITEMS, title: 'アカウント' },
            ].map((group) => (
              <div className="space-y-1" key={group.title}>
                <p className="px-3 text-caption font-semibold text-primary-foreground/80">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <Link
                    className={twMerge(
                      barItemClassName,
                      'flex font-normal aria-[current=page]:bg-primary-foreground/10 aria-[current=page]:font-semibold',
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
            <Form
              action={signOut}
              className="border-t border-primary-foreground/20 pt-4"
            >
              <SubmitButton
                className={twMerge(
                  barItemClassName,
                  'w-full justify-start font-normal',
                )}
                type="submit"
                variant="ghost"
              >
                ログアウト
              </SubmitButton>
            </Form>
          </div>
        </div>
      )}
    </nav>
  )
}
