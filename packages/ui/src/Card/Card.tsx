import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

const cardVariants = cva(
  'flex flex-col overflow-hidden rounded-xl border border-border text-text shadow',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'bg-surface-sunken hover:shadow-xl',
        elevated: 'bg-surface-raised shadow-md hover:shadow-xl',
        outlined: 'bg-transparent shadow-none hover:shadow-md',
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
