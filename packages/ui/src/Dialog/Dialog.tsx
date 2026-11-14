import * as DialogPrimitive from '@radix-ui/react-dialog'
import type { ComponentPropsWithRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogPortal = DialogPrimitive.Portal

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={twMerge(
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=open]:animate-in fixed inset-0 bg-black/50',
        className,
      )}
      {...props}
    />
  )
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Content
      className={twMerge(
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=open]:animate-in fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-surface p-6 text-foreground shadow-lg',
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  )
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={twMerge(
        'mb-4 text-xl font-semibold text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={twMerge('mb-6 text-muted-foreground', className)}
      {...props}
    />
  )
}
