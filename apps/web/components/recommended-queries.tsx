import { Hash } from "lucide-react";
import Link from "next/link";

import { getVideosPath } from "@/lib/video-kind-filter";

import { ListOption, ListOptionIcon } from "./list-option";

interface RecommendedQueriesProps {
  onClickLink?: () => void;
  queries: string[];
  /** リンク先に引き継ぐタレントの ID */
  talentIds?: readonly string[];
  variant?: "default" | "list";
}

/**
 * Display recommended search keywords as clickable links
 *
 * @param queries - Array of recommended search query strings
 * @param variant - Display variant: 'default' for wrapping pills, 'list' for vertical list with icons
 * @param onClickLink - Optional callback when a link is clicked
 * @param talentIds - Talent IDs to carry over to the search results
 */
export default function RecommendedQueries({
  onClickLink,
  queries,
  talentIds = [],
  variant = "default",
}: RecommendedQueriesProps) {
  if (queries.length === 0) {
    return null;
  }

  // List variant: similar to search suggestions
  if (variant === "list") {
    return (
      <nav aria-label="おすすめの検索キーワード">
        <div className="max-h-96 overflow-y-auto">
          <div className="p-2">
            {queries.map((query) => (
              <ListOption asChild key={query}>
                <Link
                  href={getVideosPath(query, "all", talentIds)}
                  {...(onClickLink ? { onClick: onClickLink } : {})}
                >
                  <ListOptionIcon>
                    <Hash />
                  </ListOptionIcon>
                  <span>{query}</span>
                </Link>
              </ListOption>
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Default variant: pills that wrap onto the next line
  return (
    <nav aria-label="おすすめの検索キーワード">
      <ul className="flex flex-wrap justify-center gap-2">
        {queries.map((query) => (
          <li key={query}>
            <Link
              aria-label={`『${query}』の検索結果`}
              className="inline-flex h-9 items-center rounded-full border border-border px-4 text-meta text-foreground focus-ring hover:bg-muted"
              href={getVideosPath(query, "all", talentIds)}
              title={`『${query}』の検索結果`}
              {...(onClickLink ? { onClick: onClickLink } : {})}
            >
              {query}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
