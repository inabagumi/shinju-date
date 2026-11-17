import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'
import { FOCUS_RING } from '../focus.js'
import { twMerge } from '../tw-merge.js'

export const ToastProvider = ToastPrimitive.Provider

export function ToastViewport({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={twMerge(
        'fixed bottom-0 left-0 z-100 flex max-h-screen w-full flex-col p-4 md:max-w-[420px]',
        className,
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  'data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-bottom-full group data-[state=closed]:animate-out data-[state=open]:animate-in data-[swipe=end]:animate-out pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-container border p-4 pr-8 shadow-overlay transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        danger: 'border-danger bg-surface text-danger',
        default: 'border-border bg-surface text-foreground',
        success: 'border-success bg-surface text-success',
        warning: 'border-warning bg-surface text-warning',
      },
    },
  },
)

export type ToastProps = ComponentPropsWithRef<typeof ToastPrimitive.Root> &
  VariantProps<typeof toastVariants>

export function Toast({ className, variant, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      className={twMerge(toastVariants({ variant }), className)}
      {...props}
    />
  )
}

export function ToastClose({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      className={twMerge(
        'absolute top-2 right-2 rounded-control p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100',
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      <X className="size-4" />
    </ToastPrimitive.Close>
  )
}

export function ToastTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      className={twMerge('text-meta leading-5 font-semibold', className)}
      {...props}
    />
  )
}
