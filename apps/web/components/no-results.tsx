import { Button } from "@shinju-date/ui";
import Link from "next/link";

import RecommendedQueries from "./recommended-queries";

const NO_RECOMMENDED_QUERIES: string[] = [];

interface NoResultsProps {
  /** 絞り込みを解除したページのパス。渡すと解除するリンクを出す */
  clearFiltersHref?: string | undefined;
  /** 見つからなかったときに次に試すことの案内 */
  hint?: string;
  message: string;
  recommendedQueries?: string[];
  title?: string;
}

export default function NoResults({
  clearFiltersHref,
  hint,
  message,
  recommendedQueries = NO_RECOMMENDED_QUERIES,
  title,
}: NoResultsProps) {
  return (
    <div className="space-y-8 py-16 text-center">
      {title && <h1 className="text-title font-bold">{title}</h1>}

      <div className="mx-auto max-w-text space-y-2">
        <p className="text-body text-balance">{message}</p>
        {hint && <p className="text-meta text-balance text-muted">{hint}</p>}
      </div>

      {recommendedQueries.length > 0 && (
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-meta text-muted">
            おすすめの検索キーワード
          </h2>
          <RecommendedQueries queries={recommendedQueries} />
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-3">
        {clearFiltersHref && (
          <Button asChild size="lg">
            <Link href={clearFiltersHref}>絞り込みを解除</Link>
          </Button>
        )}
        <Button asChild size="lg" variant="secondary">
          <Link href="/videos">新着動画を見る</Link>
        </Button>
      </div>
    </div>
  );
}
