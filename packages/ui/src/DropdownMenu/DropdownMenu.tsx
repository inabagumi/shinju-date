import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from '../tw-merge.js'

/**
 * ボタンから開くメニュー。矢印キーでの移動、Enter での実行、Escape と外側の
 * クリックで閉じること、文字を打っての移動は Radix に任せる。
 */
export const DropdownMenu = DropdownMenuPrimitive.Root

export interface DropdownMenuTriggerProps
  extends ComponentPropsWithRef<typeof DropdownMenuPrimitive.Trigger> {}

/**
 * メニューを開くボタン。既定は行末の「︙」などに使うアイコンのボタンの見た目にする。
 * `asChild` で子の要素をボタンにするときは、既定の見た目を付けず、子の要素の
 * 見た目をそのまま使う。
 */
export function DropdownMenuTrigger({
  asChild = false,
  className,
  ...props
}: DropdownMenuTriggerProps) {
  return (
    <DropdownMenuPrimitive.Trigger
      asChild={asChild}
      className={
        asChild
          ? className
          : twMerge(
              'rounded-control p-1 text-muted transition-colors focus-ring hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
              className,
            )
      }
      {...props}
    />
  )
}

export interface DropdownMenuContentProps
  extends ComponentPropsWithRef<typeof DropdownMenuPrimitive.Content> {}

/**
 * メニューの中身。ポータルに描画するため、横にスクロールする表の中に置いても
 * 枠で切れない。既定ではボタンの右端にそろえる（`align="end"`）。
 */
export function DropdownMenuContent({
  align = 'end',
  className,
  collisionPadding = 8,
  sideOffset = 4,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        className={twMerge(
          'z-50 min-w-40 rounded-container border border-border bg-surface p-1 text-foreground shadow-overlay',
          className,
        )}
        collisionPadding={collisionPadding}
        sideOffset={sideOffset}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

const itemVariantClassNames = {
  danger: 'text-danger data-highlighted:bg-danger/10',
  default: 'text-foreground data-highlighted:bg-muted',
} as const

export interface DropdownMenuItemProps
  extends ComponentPropsWithRef<typeof DropdownMenuPrimitive.Item> {
  /** 削除など、取り消せない操作は `danger` にする */
  variant?: keyof typeof itemVariantClassNames
}

/**
 * メニューの項目。選ぶと `onSelect` が呼ばれ、メニューが閉じる。
 * リンクにするときは `asChild` で `<a>` などを子に渡す。
 */
export function DropdownMenuItem({
  className,
  variant = 'default',
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={twMerge(
        'flex w-full items-center gap-2 rounded-control px-3 py-2 text-left text-meta leading-5 whitespace-nowrap transition-colors outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50',
        itemVariantClassNames[variant],
        className,
      )}
      {...props}
    />
  )
}

export interface DropdownMenuSeparatorProps
  extends ComponentPropsWithRef<typeof DropdownMenuPrimitive.Separator> {}

/** 項目のまとまりを分ける線 */
export function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      className={twMerge('my-1 h-px bg-border', className)}
      {...props}
    />
  )
}
