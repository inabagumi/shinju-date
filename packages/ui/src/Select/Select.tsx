import type { VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { inputVariants } from '../Input/Input'
import { twMerge } from '../tw-merge'

/**
 * 右端の下向きの矢印（lucide の `chevron-down`）。背景画像は `currentColor` を
 * 使えないため、ライトとダークのどちらの地でも見分けられる灰色（zinc-500）で描く。
 */
const CHEVRON_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
)}")`

export type SelectProps = Omit<ComponentPropsWithRef<'select'>, 'size'> &
  VariantProps<typeof inputVariants>

/**
 * セレクトボックス。`Input` と同じ高さ・枠・角丸・フォーカス表示にする。
 * 選択肢は `<option>` で渡す。
 */
export function Select({
  className,
  inputSize,
  style,
  variant,
  ...props
}: SelectProps) {
  return (
    <select
      className={twMerge(
        inputVariants({ inputSize, variant }),
        'cursor-pointer appearance-none bg-size-[1rem] bg-position-[right_0.75rem_center] bg-no-repeat pr-10',
        className,
      )}
      style={{ backgroundImage: CHEVRON_IMAGE, ...style }}
      {...props}
    />
  )
}
