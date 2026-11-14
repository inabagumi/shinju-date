import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50',
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
        danger: 'border border-danger text-danger hover:bg-danger/10',
        ghost: 'hover:bg-muted',
        primary: 'bg-accent text-accent-foreground hover:bg-accent/90',
        secondary:
          'border border-border bg-surface text-foreground hover:bg-muted',
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
