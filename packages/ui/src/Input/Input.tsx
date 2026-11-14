import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const inputVariants = cva(
  'w-full rounded-md border bg-surface-raised px-4 py-2 text-text transition-colors outline-none placeholder:text-text-muted disabled:cursor-not-allowed disabled:opacity-50',
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
        default:
          'border-border focus:border-accent focus:ring-2 focus:ring-accent/20',
        error:
          'border-danger focus:border-danger focus:ring-2 focus:ring-danger/20',
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
