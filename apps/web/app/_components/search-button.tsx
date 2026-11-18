"use client";

import { Search } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import { useSearchModal } from "./search-modal-context";

// The platform does not change while the page is open
const subscribeNothing = () => () => {
  // Nothing to unsubscribe from
};

const getIsMac = (): boolean | undefined =>
  typeof window !== "undefined" &&
  navigator.userAgent.toUpperCase().includes("MAC");

// Unknown on the server and while hydrating, so that the markup matches
const getServerIsMac = (): boolean | undefined => undefined;

export const SearchButton = () => {
  const isMac = useSyncExternalStore(
    subscribeNothing,
    getIsMac,
    getServerIsMac
  );
  const { openModal } = useSearchModal();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        openModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModal]);

  return (
    <button
      aria-keyshortcuts="Control+K Meta+K"
      aria-label="動画を検索"
      className="flex h-10 w-full min-w-0 items-center gap-2 rounded-control border border-border bg-background px-3 text-left text-meta text-muted focus-ring transition-colors hover:border-accent hover:text-foreground focus-visible:border-accent md:max-w-md"
      onClick={openModal}
      type="button"
    >
      <Search aria-hidden="true" className="size-5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">動画を検索</span>
      {isMac !== undefined && (
        <kbd className="hidden rounded-control border border-border bg-surface px-1.5 font-sans text-caption text-muted sm:inline-block">
          {isMac ? "⌘" : "Ctrl"} K
        </kbd>
      )}
    </button>
  );
};
