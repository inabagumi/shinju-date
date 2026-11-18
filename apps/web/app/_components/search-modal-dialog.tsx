"use client";

import {
  Dialog,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@shinju-date/ui";
import { Suspense, useCallback } from "react";

import { SearchModalContent } from "./search-modal-content";
import { useSearchModal } from "./search-modal-context";

export function SearchModalDialog() {
  const { isOpen, closeModal } = useSearchModal();

  const handleClose = useCallback(
    (open: boolean) => {
      if (!open) {
        closeModal();
      }
    },
    [closeModal]
  );

  return (
    <Dialog onOpenChange={handleClose} open={isOpen}>
      <DialogPortal>
        <DialogOverlay className="z-50 backdrop-blur-sm" />

        <DialogContent className="top-[20%] left-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-20%] border border-border p-0 sm:max-w-3xl">
          <DialogTitle className="sr-only">検索</DialogTitle>

          <Suspense
            fallback={
              <div className="flex h-96 items-center justify-center">
                <div>Loading...</div>
              </div>
            }
          >
            <SearchModalContent onClose={() => handleClose(false)} />
          </Suspense>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
