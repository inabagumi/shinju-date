import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";

import { SearchResultsSkeleton } from "@/components/search-results";
import { createPageMetadata } from "@/lib/metadata";
import { TALENT_SEARCH_PARAM } from "@/lib/talent-filter";
import { parseQueries } from "@/lib/url";
import {
  getVideosCalendarPath,
  getVideosPath,
  parseVideoKindFilter,
  VIDEO_KIND_SEARCH_PARAM,
} from "@/lib/video-kind-filter";

import {
  getSelectedTalentIds,
  VideosPageHeading,
  VideosPageHeadingSkeleton,
  VideosPageResults,
} from "./_components/videos-page-sections";

export const generateMetadata = async (
  { params, searchParams }: PageProps<"/videos/[[...queries]]">,
  parent: ResolvingMetadata
): Promise<Metadata> => {
  const [{ queries }, searchParamValues, parentMetadata] = await Promise.all([
    params,
    searchParams,
    parent,
  ]);
  const query = parseQueries(queries);
  const talentIds = await getSelectedTalentIds(
    searchParamValues[TALENT_SEARCH_PARAM]
  );
  const kind = parseVideoKindFilter(searchParamValues[VIDEO_KIND_SEARCH_PARAM]);
  const metadata = createPageMetadata({
    // タレントでの絞り込みは検索結果と同じく、検索エンジンに載せない
    index: !query && talentIds.length === 0,
    path: getVideosPath(query, "all"),
    title: query ? `『${query}』の検索結果` : "動画一覧",
    type: "article",
  });

  return {
    ...metadata,
    alternates: {
      ...metadata.alternates,
      types: {
        "text/calendar": query ? null : getVideosCalendarPath(kind, talentIds),
      },
    },
    openGraph: {
      ...metadata.openGraph,
      // `app/videos/opengraph-image.tsx`. A catch-all segment cannot have an
      // image file, and `openGraph` of this segment replaces that of the
      // parent segment, so its image is taken over here.
      ...(parentMetadata.openGraph?.images && {
        images: parentMetadata.openGraph.images,
      }),
    },
  };
};

export default function VideosPage({
  params,
  searchParams,
}: PageProps<"/videos/[[...queries]]">) {
  return (
    <>
      <Suspense fallback={<VideosPageHeadingSkeleton />}>
        <VideosPageHeading params={params} searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={<SearchResultsSkeleton />}>
        <VideosPageResults params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
