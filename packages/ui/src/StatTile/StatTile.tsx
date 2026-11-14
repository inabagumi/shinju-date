import { cva } from 'class-variance-authority'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import { twMerge } from '../tw-merge'

/**
 * 前日比などの変化の意味。値の増減ではなく、良い変化か悪い変化かで選ぶ
 * （エラーの件数が増えたなら `negative`）。
 */
export type StatTileTone = 'negative' | 'neutral' | 'positive'

const changeVariants = cva('text-caption tabular-nums', {
  defaultVariants: {
    tone: 'neutral',
  },
  variants: {
    tone: {
      negative: 'text-danger',
      neutral: 'text-muted',
      positive: 'text-success',
    },
  },
})

export interface StatTileProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** 前日比などの変化（「+12（前日比）」など）。符号も文字で書く */
  change?: ReactNode
  /** 変化の意味。色は意味があるときだけ付き、既定は `neutral`（`text-muted`） */
  changeTone?: StatTileTone
  label: ReactNode
  value: ReactNode
}

/**
 * 統計のタイル。ラベル・値・前日比を縦に並べる。地は `bg-surface` と `border` で、
 * 色は前日比の増減など意味があるときだけ使う。
 */
export function StatTile({
  change,
  changeTone,
  className,
  label,
  value,
  ...props
}: StatTileProps) {
  return (
    <div
      className={twMerge(
        'rounded-container border border-border bg-surface p-4',
        className,
      )}
      {...props}
    >
      <dl className="flex flex-col gap-1">
        <dt className="text-meta text-muted">{label}</dt>
        <dd className="text-title font-bold text-foreground tabular-nums">
          {value}
        </dd>
        {change !== undefined && change !== null && (
          <dd className={changeVariants({ tone: changeTone })}>{change}</dd>
        )}
      </dl>
    </div>
  )
}
