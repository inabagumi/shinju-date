import * as ToastPrimitive from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const ToastProvider = ToastPrimitive.Provider

export function ToastViewport({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      className={twMerge(
        'fixed bottom-0 left-0 z-[100] flex max-h-screen w-full flex-col p-4 sm:bottom-0 sm:left-0 md:max-w-[420px]',
        className,
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  'data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left-full data-[state=open]:slide-in-from-bottom-full group sm:data-[state=closed]:slide-out-to-left-full data-[state=closed]:animate-out data-[state=open]:animate-in data-[swipe=end]:animate-out pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-[transform_200ms_ease-out] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-border bg-surface-raised text-text',
        destructive: 'border-danger bg-surface-raised text-danger',
        success: 'border-success bg-surface-raised text-success',
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

export function ToastAction({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      className={twMerge(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-surface-sunken focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-raised focus:outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
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
        'absolute top-2 right-2 rounded-md p-1 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-text focus:opacity-100 focus:ring-2 focus:ring-accent focus:outline-none',
        className,
      )}
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitive.Close>
  )
}

export function ToastTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      className={twMerge('text-sm font-semibold', className)}
      {...props}
    />
  )
}

export function ToastDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      className={twMerge('text-sm opacity-90', className)}
      {...props}
    />
  )
}
