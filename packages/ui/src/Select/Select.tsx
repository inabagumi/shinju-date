import type { VariantProps } from 'class-variance-authority'
import { ChevronDown } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'
import { inputVariants } from '../Input/Input'
import { twMerge } from '../tw-merge'

export type SelectProps = Omit<ComponentPropsWithRef<'select'>, 'size'> &
  VariantProps<typeof inputVariants>

/**
 * セレクトボックス。`Input` と同じ高さ・枠・角丸・フォーカス表示にする。
 * 選択肢は `<option>` で渡す。
 *
 * 右端の矢印を `text-muted` で重ねるため、`<select>` を入れ物で囲む。
 * `className` は入れ物に付くので、幅や余白などの配置を指定する。
 * そのほかの属性は `<select>` に付く。
 */
export function Select({
  className,
  inputSize,
  variant,
  ...props
}: SelectProps) {
  return (
    <div className={twMerge('relative w-full', className)}>
      <select
        className={twMerge(
          inputVariants({ inputSize, variant }),
          'peer cursor-pointer appearance-none pr-10',
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted peer-disabled:opacity-50"
      />
    </div>
  )
}
