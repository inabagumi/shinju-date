import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from '../tw-merge.js'

/**
 * 入力欄の見た目。`Select` と `Textarea` も同じ余白・枠・角丸・フォーカス表示にするために使う。
 *
 * 文字は、どの大きさでも 16px にする。iOS の Safari は、16px 未満の入力欄にフォーカスすると
 * 画面を拡大するため。`sm` は余白で小ささを出す。
 * 参考: https://webkit.org/blog/5610/input-tips-for-building-great-web-forms-on-mobile/
 */
export const inputVariants = cva(
  'w-full rounded-control border bg-surface px-4 py-2 text-foreground transition-colors placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
  {
    defaultVariants: {
      inputSize: 'md',
      variant: 'default',
    },
    variants: {
      inputSize: {
        lg: 'px-4 py-3 text-body leading-normal',
        md: 'px-4 py-2 text-body leading-normal',
        sm: 'px-3 py-1 text-body leading-normal',
      },
      variant: {
        danger: 'border-danger field-focus-ring-danger',
        default: 'border-border field-focus-ring',
      },
    },
  },
)

export type InputProps = ComponentPropsWithRef<'input'> &
  VariantProps<typeof inputVariants>

export function Input({
  className,
  variant,
  inputSize,
  type = 'text',
  ...props
}: InputProps) {
  return (
    <input
      className={twMerge(inputVariants({ inputSize, variant }), className)}
      type={type}
      {...props}
    />
  )
}
