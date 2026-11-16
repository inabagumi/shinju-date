import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from '../tw-merge.js'

/** 入力欄の見た目。`Select` と `Textarea` も同じ余白・枠・角丸・フォーカス表示にするために使う */
export const inputVariants = cva(
  'w-full rounded-control border bg-surface px-4 py-2 text-foreground transition-colors outline-none placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50',
  {
    defaultVariants: {
      inputSize: 'md',
      variant: 'default',
    },
    variants: {
      inputSize: {
        lg: 'px-4 py-3 text-base',
        md: 'px-4 py-2 text-base',
        sm: 'px-3 py-1.5 text-sm',
      },
      variant: {
        danger:
          'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20',
        default:
          'border-border focus:border-accent focus:ring-2 focus:ring-accent/20',
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
