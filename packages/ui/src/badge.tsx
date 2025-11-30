import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-1 font-medium text-xs',
  {
    defaultVariants: {
      variant: 'info',
    },
    variants: {
      variant: {
        error: 'border-red-300 bg-red-100 text-red-800',
        info: 'border-774-blue-300 bg-774-blue-100 text-774-blue-800',
        secondary: 'border-slate-300 bg-slate-100 text-slate-600',
        success: 'border-green-300 bg-green-100 text-green-800',
        warning: 'border-yellow-300 bg-yellow-100 text-yellow-800',
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
