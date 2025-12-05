import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

// Note: Using text-base (16px) instead of text-sm (14px) to prevent iOS Safari
// from zooming in when focusing on the textarea. iOS Safari zooms on input fields
// with font-size < 16px by default.
// Reference: https://webkit.org/blog/5610/input-tips-for-building-great-web-forms-on-mobile/
const textareaVariants = cva(
  'block w-full rounded-md border px-3 py-2 text-base transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default:
          'border-gray-300 focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white',
        error:
          'border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-600',
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
