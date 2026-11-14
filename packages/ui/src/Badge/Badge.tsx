import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium',
  {
    defaultVariants: {
      variant: 'info',
    },
    variants: {
      variant: {
        error: 'border-danger/30 bg-danger/10 text-danger',
        info: 'border-accent/30 bg-accent/10 text-accent',
        secondary: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/30 bg-success/10 text-success',
        warning: 'border-warning/30 bg-warning/10 text-warning',
      },
    },
  },
)

export type BadgeProps = ComponentPropsWithRef<'span'> &
  VariantProps<typeof badgeVariants>

export function Badge({ variant, className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}
