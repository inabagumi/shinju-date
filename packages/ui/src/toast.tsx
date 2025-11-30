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
        'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-0 sm:right-0 sm:flex-col md:max-w-[420px]',
        className,
      )}
      {...props}
    />
  )
}

const toastVariants = cva(
  'data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full group sm:data-[state=closed]:slide-out-to-right-full pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[swipe=end]:animate-out data-[swipe=cancel]:transition-[transform_200ms_ease-out]',
  {
    defaultVariants: {
      variant: 'default',
    },
    variants: {
      variant: {
        default: 'border-gray-200 bg-white text-gray-900',
        destructive:
          'border-red-200 bg-red-50 text-red-900 [&>svg]:text-red-600',
        success:
          'border-green-200 bg-green-50 text-green-900 [&>svg]:text-green-600',
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
        'inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 font-medium text-sm transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
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
        'absolute top-2 right-2 rounded-md p-1 text-gray-500 opacity-0 transition-opacity hover:text-gray-900 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100',
        className,
      )}
      toast-close=""
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
      className={twMerge('font-semibold text-sm', className)}
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
