import { cva, type VariantProps } from 'class-variance-authority'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'
import { twMerge } from 'tailwind-merge'

const textareaVariants = cva(
  'block w-full rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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

export type TextareaProps = ComponentPropsWithoutRef<'textarea'> &
  VariantProps<typeof textareaVariants>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <textarea
        className={twMerge(textareaVariants({ variant }), className)}
        ref={ref}
        {...props}
      />
    )
  },
)

Textarea.displayName = 'Textarea'
