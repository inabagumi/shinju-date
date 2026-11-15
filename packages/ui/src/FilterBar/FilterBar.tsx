import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { type ComponentPropsWithoutRef, useId } from 'react'
import { Button } from '../Button/Button.js'
import { twMerge } from '../tw-merge.js'

export interface FilterBarProps
  extends Omit<ComponentPropsWithoutRef<typeof Collapsible.Root>, 'asChild'> {
  /** 適用中の絞り込みの件数。狭い画面で折りたたんだときに表示する */
  activeCount?: number
  /** 絞り込みのまとまりの名前。狭い画面で開閉するボタンの文字にもなる */
  label?: string
}

/**
 * 絞り込みを横に並べる入れ物。`md` 以上では常に表示し、狭い画面では
 * ボタンの中に折りたたんで、適用中の件数を表示する。
 *
 * 開閉の状態は Radix UI の Collapsible が持つため、サーバーコンポーネントからも
 * そのまま使える。
 */
export function FilterBar({
  activeCount = 0,
  children,
  className,
  label = '絞り込み',
  ...props
}: FilterBarProps) {
  const contentId = useId()

  return (
    <Collapsible.Root
      aria-label={label}
      className={twMerge('group/filter-bar flex flex-col gap-3', className)}
      role="group"
      {...props}
    >
      <Collapsible.Trigger aria-controls={contentId} asChild>
        <Button className="gap-2 self-start md:hidden" variant="secondary">
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          {label}
          {activeCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-caption font-semibold text-accent-foreground tabular-nums">
              {activeCount}
              <span className="sr-only">件適用中</span>
            </span>
          )}
          <ChevronDown
            aria-hidden="true"
            className="size-4 text-muted transition-transform group-data-[state=open]/filter-bar:rotate-180"
          />
        </Button>
      </Collapsible.Trigger>
      {/*
       * Radix の `Collapsible.Content` は閉じている間は中身を描画しないため、
       * `md` 以上で常に表示できない。中身は常に描画し、狭い画面で閉じている間
       * だけ CSS で隠す。
       */}
      <div
        className="hidden flex-col gap-3 group-data-[state=open]/filter-bar:flex md:flex md:flex-row md:flex-wrap md:items-end"
        id={contentId}
      >
        {children}
      </div>
    </Collapsible.Root>
  )
}
