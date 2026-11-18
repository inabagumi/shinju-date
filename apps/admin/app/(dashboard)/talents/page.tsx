import { PageHeader } from "@shinju-date/ui";
import type { Metadata } from "next";
import { Suspense } from "react";

import { toURLSearchParams } from "@/lib/search-params-href";

import { TalentsList, TalentsListSkeleton } from "./_components/talents-list";
import { filterTalents } from "./_lib/filter-talents";
import { getTalents } from "./_lib/get-talents";
import { talentSearchParamsSchema } from "./_lib/search-params-schema";

export const metadata: Metadata = {
  title: "タレント管理",
};

const TalentsListData = async ({
  searchParams,
}: Pick<PageProps<"/talents">, "searchParams">) => {
  const [talents, rawParams] = await Promise.all([getTalents(), searchParams]);
  const filters = talentSearchParamsSchema.parse(rawParams);

  return (
    <TalentsList
      search={filters.search}
      searchParams={toURLSearchParams(rawParams)}
      sortOrder={filters.sort}
      statusFilter={filters.status}
      talents={filterTalents(talents, filters)}
    />
  );
};

export default function TalentsPage({ searchParams }: PageProps<"/talents">) {
  return (
    <div>
      <PageHeader
        description="登録されているタレントの一覧を表示します。"
        title="タレント管理"
      />

      <Suspense fallback={<TalentsListSkeleton />}>
        <TalentsListData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
