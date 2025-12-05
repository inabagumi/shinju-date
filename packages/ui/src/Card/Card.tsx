import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const cardVariants = cva(
  'flex flex-col overflow-hidden rounded-xl border shadow',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default:
          'border-gray-200 bg-gray-100 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-800 dark:shadow-none',
        elevated:
          'border-gray-200 bg-white shadow-md hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900',
        outlined:
          'border-gray-300 bg-transparent shadow-none hover:shadow-md dark:border-zinc-700',
      },
    },
  },
)

export type CardProps = ComponentPropsWithRef<'div'> &
  VariantProps<typeof cardVariants>

export function Card({ className, variant, ...props }: CardProps) {
  return (
    <div className={twMerge(cardVariants({ variant }), className)} {...props} />
  )
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithRef<'div'>) {
  return <div className={twMerge('p-6 pb-0', className)} {...props} />
}

export function CardContent({
  className,
  ...props
}: ComponentPropsWithRef<'div'>) {
  return <div className={twMerge('p-6', className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: ComponentPropsWithRef<'div'>) {
  return <div className={twMerge('p-6 pt-0', className)} {...props} />
}
