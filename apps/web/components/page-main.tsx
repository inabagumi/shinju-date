import { twMerge } from "@shinju-date/ui";
import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "./skip-link";

interface PageMainProps {
  children: ReactNode;
  className?: string | undefined;
}

/**
 * The `<main>` of every page: the width of the site, the padding around the
 * content, and the `id` the skip link moves to.
 */
export default function PageMain({ children, className }: PageMainProps) {
  return (
    <main
      className={twMerge("mx-auto max-w-6xl scroll-mt-20 px-4 py-8", className)}
      id={MAIN_CONTENT_ID}
    >
      {children}
    </main>
  );
}
