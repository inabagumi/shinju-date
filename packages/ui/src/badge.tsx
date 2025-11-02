import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

export type BadgeVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'secondary'

export type BadgeProps = ComponentPropsWithRef<'span'> & {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  error: 'bg-red-100 text-red-800 border-red-300',
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  secondary: 'bg-slate-100 text-slate-600 border-slate-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
}

export function Badge({ variant = 'info', className, ...props }: BadgeProps) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full border px-2 py-1 font-medium text-xs',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}
