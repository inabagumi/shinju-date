import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ComponentPropsWithRef } from "react";

import { twMerge } from "../tw-merge.js";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

export function DialogOverlay({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={twMerge(
        "fixed inset-0 bg-black/50 motion-safe:data-[state=closed]:animate-fade-out motion-safe:data-[state=open]:animate-fade-in",
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Content
      className={twMerge(
        "fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-container bg-surface p-6 text-foreground shadow-overlay motion-safe:data-[state=closed]:animate-scale-out motion-safe:data-[state=open]:animate-scale-in",
        className
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  );
}

export function DialogTitle({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={twMerge(
        "mb-4 text-heading font-bold text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: ComponentPropsWithRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={twMerge("mb-6 text-meta text-muted", className)}
      {...props}
    />
  );
}
