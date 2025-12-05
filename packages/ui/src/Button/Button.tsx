import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
  {
    defaultVariants: {
      size: 'md',
      variant: 'primary',
    },
    variants: {
      size: {
        lg: 'px-6 py-3 text-base',
        md: 'px-4 py-2 text-sm',
        sm: 'px-3 py-1 text-sm',
      },
      variant: {
        danger:
          'border border-red-600 text-red-600 hover:bg-red-50 dark:border-red-500 dark:text-red-500 dark:hover:bg-red-950',
        ghost: 'hover:bg-gray-100 dark:hover:bg-zinc-800',
        primary:
          'bg-primary text-primary-foreground hover:bg-774-nevy-900 dark:bg-774-nevy-900 dark:hover:bg-774-nevy-800',
        secondary:
          'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
        'secondary-blue':
          'bg-secondary-blue text-secondary-blue-foreground hover:bg-774-blue-800 active:bg-774-blue-600',
        'secondary-pink':
          'bg-secondary-pink text-secondary-pink-foreground hover:bg-774-pink-600 active:bg-774-pink-700',
      },
    },
  },
)

export type ButtonProps = ComponentPropsWithRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

export function Button({
  asChild = false,
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={twMerge(buttonVariants({ size, variant }), className)}
      type={asChild ? undefined : type}
      {...props}
    />
  )
}
