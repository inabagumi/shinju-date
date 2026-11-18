import type { ReactNode } from "react";
import { useId } from "react";

interface HomeSectionProps {
  /** 見出しの右端に置く件数や「もっと見る」のリンク */
  aside?: ReactNode;
  children: ReactNode;
  title: ReactNode;
}

/**
 * トップページの各セクション（配信中・配信予定・新着動画・ショート）の型。
 * 見出し（20px・太字）の右端に件数やリンクを置き、その下に内容を並べる。
 * セクション間の余白は並べる側（48px）で揃える。
 */
export default function HomeSection({
  aside,
  children,
  title,
}: HomeSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h2
          className="flex items-center gap-2 text-heading font-bold"
          id={headingId}
        >
          {title}
        </h2>

        {aside && <div className="shrink-0 text-meta">{aside}</div>}
      </header>

      {children}
    </section>
  );
}

interface HomeSectionCountProps {
  count: number;
}

export const HomeSectionCount = ({ count }: HomeSectionCountProps) => (
  <p className="text-muted tabular-nums">{count}件</p>
);

export const HomeSectionCountSkeleton = () => (
  <span
    aria-hidden="true"
    className="inline-block h-4 w-8 animate-pulse rounded-control bg-muted align-middle"
  />
);
