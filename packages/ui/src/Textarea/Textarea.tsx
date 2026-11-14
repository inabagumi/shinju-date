import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

// Note: Using text-base (16px) instead of text-sm (14px) to prevent iOS Safari
// from zooming in when focusing on the textarea. iOS Safari zooms on input fields
// with font-size < 16px by default.
// Reference: https://webkit.org/blog/5610/input-tips-for-building-great-web-forms-on-mobile/
const textareaVariants = cva(
  'block w-full rounded-md border bg-surface px-3 py-2 text-base text-foreground transition-colors placeholder:text-muted focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-border focus:border-accent focus:ring-accent',
        error: 'border-danger focus:border-danger focus:ring-danger',
      },
    },
  },
)

export type TextareaProps = ComponentProps<'textarea'> &
  VariantProps<typeof textareaVariants>

export function Textarea({
  className,
  variant = 'default',
  ...props
}: TextareaProps) {
  return (
    <textarea
      className={twMerge(textareaVariants({ variant }), className)}
      {...props}
    />
  )
}
