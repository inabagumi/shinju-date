import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const inputVariants = cva(
  'w-full rounded-md border bg-white px-4 py-2 outline-none transition-colors placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500',
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
          'border-gray-300 text-gray-900 focus:border-774-blue-500 focus:ring-2 focus:ring-774-blue-500/20 dark:border-zinc-700 dark:text-zinc-100 dark:focus:border-774-blue-500',
        error:
          'border-red-500 text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:text-zinc-100',
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
