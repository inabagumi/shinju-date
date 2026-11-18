import type { Metadata } from "next";

import { Header } from "@/components/header";
import { NotFoundContent } from "@/components/not-found-content";

export const metadata: Metadata = {
  title: "ページが見つかりません",
};

// `(dashboard)/not-found.tsx` handles `notFound()` inside the dashboard layout,
// while this file handles unmatched URLs, which render outside of it.
export default function NotFound() {
  return (
    <div>
      <Header />
      <main className="mx-auto w-full max-w-7xl px-6 py-6">
        <NotFoundContent />
      </main>
    </div>
  );
}
